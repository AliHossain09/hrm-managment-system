<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\Department;
use App\Models\Designation;
use App\Models\EmployeeBankAccount;
use App\Models\EmployeeCompensation;
use App\Models\EmployeeProfile;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\WorkspaceUserRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class StaffService
{
    public function users(?User $actor = null): array
    {
        $query = User::query()
            ->with([
                'roles:id,name',
                'employeeProfile',
                'employeeProfile.branch:id,name',
                'employeeProfile.department:id,name',
                'employeeProfile.designation:id,name',
                'currentCompensation',
                'employeeBankAccount:id,user_id,workspace_id,bank_name,branch_location,account_number',
            ])
            ->latest('id');

        if ($actor && $actor->current_workspace_id) {
            $workspaceId = (int) $actor->current_workspace_id;
            $query->whereHas('workspaceRoles', function ($q) use ($workspaceId): void {
                $q->where('workspace_id', $workspaceId);
            });
        }

        $users = $query->get();

        if ($actor) {
            $authService = app(AuthService::class);
            $users = $users->filter(function (User $target) use ($actor, $authService): bool {
                return $authService->canManageUserAccount($actor, $target);
            });
        }

        return $users
            ->map(fn (User $user): array => $this->mapUser($user))
            ->values()
            ->toArray();
    }

    public function createUser(array $payload, ?User $actor = null): User
    {
        $role = Role::query()->where('name', $payload['role_name'])->firstOrFail();
        $normalizedRole = Str::of($role->name)->lower()->replace('_', ' ')->value();

        $avatarPath = null;
        if (isset($payload['avatar']) && $payload['avatar'] instanceof UploadedFile) {
            $avatarPath = $this->storeAvatar($payload['avatar']);
        }

        $workspaceId = $actor?->current_workspace_id;
        $userType = (string) ($payload['user_type'] ?? 'permanent');

        $user = DB::transaction(function () use ($payload, $normalizedRole, $avatarPath, $workspaceId, $role, $userType): User {
            $user = User::query()->create([
                'name' => $payload['name'],
                'email' => $payload['email'],
                'password' => Hash::make($payload['password']),
                'type' => $normalizedRole,
                'account_level' => str_replace(' ', '_', $normalizedRole),
                'current_workspace_id' => $workspaceId,
                'avatar' => $avatarPath,
                'user_type' => $userType,
                'part_time_hours' => $userType === 'part_time' ? (int) ($payload['part_time_hours'] ?? 0) : null,
                'is_active' => 1,
                'email_verified_at' => now(),
            ]);

            $this->syncUserRole($user, $role);

            if ($workspaceId) {
                WorkspaceUserRole::query()->updateOrCreate(
                    ['workspace_id' => $workspaceId, 'user_id' => $user->id],
                    ['role' => str_replace(' ', '_', $normalizedRole)]
                );
            }

            return $user;
        });

        return $user->load([
            'roles:id,name',
            'employeeProfile.branch:id,name',
            'employeeProfile.department:id,name',
            'employeeProfile.designation:id,name',
            'currentCompensation',
            'employeeBankAccount:id,user_id,workspace_id,bank_name,branch_location,account_number',
        ]);
    }

    public function updateUser(User $user, array $payload): User
    {
        $role = Role::query()->where('name', $payload['role_name'])->firstOrFail();
        $normalizedRole = Str::of($role->name)->lower()->replace('_', ' ')->value();

        $avatarPath = $user->avatar;

        if (isset($payload['avatar']) && $payload['avatar'] instanceof UploadedFile) {
            $this->deleteAvatar($avatarPath);
            $avatarPath = $this->storeAvatar($payload['avatar']);
        }

        DB::transaction(function () use ($user, $payload, $normalizedRole, $avatarPath, $role): void {
            $userType = (string) ($payload['user_type'] ?? 'permanent');

            $updates = [
                'name' => $payload['name'],
                'email' => $payload['email'],
                'type' => $normalizedRole,
                'account_level' => str_replace(' ', '_', $normalizedRole),
                'avatar' => $avatarPath,
                'user_type' => $userType,
                'part_time_hours' => $userType === 'part_time' ? (int) ($payload['part_time_hours'] ?? 0) : null,
            ];

            if (! empty($payload['password'])) {
                $updates['password'] = Hash::make($payload['password']);
            }

            $user->update($updates);
            $this->syncUserRole($user, $role);

            if ($user->current_workspace_id) {
                $workspaceId = (int) $user->current_workspace_id;

                WorkspaceUserRole::query()->updateOrCreate(
                    ['workspace_id' => $workspaceId, 'user_id' => $user->id],
                    ['role' => str_replace(' ', '_', $normalizedRole)]
                );
            }
        });

        return $user->load([
            'roles:id,name',
            'employeeProfile.branch:id,name',
            'employeeProfile.department:id,name',
            'employeeProfile.designation:id,name',
            'currentCompensation',
            'employeeBankAccount:id,user_id,workspace_id,bank_name,branch_location,account_number',
        ]);
    }

    public function employeeRecords(?User $actor = null): array
    {
        return $this->users($actor);
    }

    public function updateEmployeeDetails(User $user, array $payload): User
    {
        $workspaceId = (int) $user->current_workspace_id;

        DB::transaction(function () use ($user, $workspaceId, $payload): void {
            $this->syncHrProfileData($user, $workspaceId, $payload);
        });

        return $user->load([
            'roles:id,name',
            'employeeProfile.branch:id,name',
            'employeeProfile.department:id,name',
            'employeeProfile.designation:id,name',
            'currentCompensation',
            'employeeBankAccount:id,user_id,workspace_id,bank_name,branch_location,account_number',
        ]);
    }

    public function deleteUser(User $user): void
    {
        $this->deleteAvatar($user->avatar);

        DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->where('model_id', $user->id)
            ->delete();

        WorkspaceUserRole::query()->where('user_id', $user->id)->delete();

        $user->delete();
    }

    public function rolesWithPermissions(): array
    {
        $permissions = Permission::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->toArray();

        $roles = Role::query()
            ->with('permissions:id,name')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(function (Role $role): array {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'permissions' => $role->permissions->pluck('name')->values()->all(),
                ];
            })
            ->toArray();

        return [
            'permissions' => $permissions,
            'roles' => $roles,
        ];
    }

    public function syncRolePermissions(Role $role, array $permissionNames): Role
    {
        $permissionIds = Permission::query()
            ->whereIn('name', $permissionNames)
            ->pluck('id')
            ->all();

        $role->permissions()->sync($permissionIds);

        return $role->load('permissions:id,name');
    }

    public function presentUser(User $user): array
    {
        return $this->mapUser($user->load([
            'roles:id,name',
            'employeeProfile.branch:id,name',
            'employeeProfile.department:id,name',
            'employeeProfile.designation:id,name',
            'currentCompensation',
            'employeeBankAccount:id,user_id,workspace_id,bank_name,branch_location,account_number',
        ]));
    }

    private function syncUserRole(User $user, Role $role): void
    {
        DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->where('model_id', $user->id)
            ->delete();

        DB::table('model_has_roles')->updateOrInsert([
            'role_id' => $role->id,
            'model_type' => User::class,
            'model_id' => $user->id,
        ], []);
    }

    private function syncHrProfileData(User $user, int $workspaceId, array $payload): void
    {
        $branchId = $this->resolveBranchId($workspaceId, $payload['branch_name'] ?? null);
        $departmentId = $this->resolveDepartmentId($workspaceId, $payload['department_name'] ?? null);
        $designationId = $this->resolveDesignationId($workspaceId, $payload['designation_name'] ?? null);

        EmployeeProfile::query()->updateOrCreate(
            [
                'workspace_id' => $workspaceId,
                'user_id' => $user->id,
            ],
            [
                'date_of_birth' => $this->nullIfBlank($payload['date_of_birth'] ?? null),
                'address' => $this->nullIfBlank($payload['address'] ?? null),
                'phone' => $this->nullIfBlank($payload['phone'] ?? null),
                'national_id_card_number' => $this->nullIfBlank($payload['national_id_card_number'] ?? null),
                'sex' => $this->nullIfBlank($payload['sex'] ?? null),
                'blood_group' => $this->nullIfBlank($payload['blood_group'] ?? null),
                'father_name' => $this->nullIfBlank($payload['father_name'] ?? null),
                'mother_name' => $this->nullIfBlank($payload['mother_name'] ?? null),
                'father_phone' => $this->nullIfBlank($payload['father_phone'] ?? null),
                'branch_id' => $branchId,
                'department_id' => $departmentId,
                'designation_id' => $designationId,
                'date_of_joining' => $this->nullIfBlank($payload['date_of_joining'] ?? null),
            ]
        );

        if (array_key_exists('basic_salary', $payload)) {
            EmployeeCompensation::query()->updateOrCreate(
                [
                    'workspace_id' => $workspaceId,
                    'user_id' => $user->id,
                    'effective_to' => null,
                ],
                [
                    'basic_salary' => $payload['basic_salary'] ?? 0,
                    'effective_from' => $payload['date_of_joining'] ?? now()->toDateString(),
                ]
            );
        }

        EmployeeBankAccount::query()->updateOrCreate(
            [
                'workspace_id' => $workspaceId,
                'user_id' => $user->id,
            ],
            [
                'bank_name' => $this->nullIfBlank($payload['bank_name'] ?? null),
                'branch_location' => $this->nullIfBlank($payload['bank_branch_location'] ?? null),
                'account_number' => $this->nullIfBlank($payload['bank_account_number'] ?? null),
            ]
        );
    }

    private function resolveBranchId(int $workspaceId, ?string $name): ?int
    {
        $clean = trim((string) $name);
        if ($clean === '') {
            return null;
        }

        return (int) Branch::query()->firstOrCreate([
            'workspace_id' => $workspaceId,
            'name' => $clean,
        ])->id;
    }

    private function resolveDepartmentId(int $workspaceId, ?string $name): ?int
    {
        $clean = trim((string) $name);
        if ($clean === '') {
            return null;
        }

        return (int) Department::query()->firstOrCreate([
            'workspace_id' => $workspaceId,
            'name' => $clean,
        ])->id;
    }

    private function resolveDesignationId(int $workspaceId, ?string $name): ?int
    {
        $clean = trim((string) $name);
        if ($clean === '') {
            return null;
        }

        return (int) Designation::query()->firstOrCreate([
            'workspace_id' => $workspaceId,
            'name' => $clean,
        ])->id;
    }

    private function mapUser(User $user): array
    {
        $roleName = $user->roles->first()?->name ?? ($user->type ?: 'N/A');
        $profile = $user->employeeProfile;
        $bank = $user->employeeBankAccount;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'is_active' => (bool) $user->is_active,
            'type' => $user->type,
            'account_level' => $user->account_level,
            'role' => $roleName,
            'user_type' => $user->user_type,
            'part_time_hours' => $user->part_time_hours,
            'avatar' => $user->avatar,
            'avatar_url' => $user->avatar ? asset($user->avatar) : null,
            'date_of_birth' => optional($profile?->date_of_birth)->format('Y-m-d'),
            'address' => $profile?->address,
            'phone' => $profile?->phone,
            'national_id_card_number' => $profile?->national_id_card_number,
            'sex' => $profile?->sex,
            'blood_group' => $profile?->blood_group,
            'father_name' => $profile?->father_name,
            'mother_name' => $profile?->mother_name,
            'father_phone' => $profile?->father_phone,
            'basic_salary' => $user->currentCompensation?->basic_salary,
            'branch_name' => $profile?->branch?->name,
            'department_name' => $profile?->department?->name,
            'designation_name' => $profile?->designation?->name,
            'date_of_joining' => optional($profile?->date_of_joining)->format('Y-m-d'),
            'bank_name' => $bank?->bank_name,
            'bank_branch_location' => $bank?->branch_location,
            'bank_account_number' => $bank?->account_number,
            'created_at' => optional($user->created_at)->format('Y-m-d H:i:s'),
            'last_login_at' => optional($user->last_login_at)->format('Y-m-d H:i:s'),
        ];
    }

    private function storeAvatar(UploadedFile $file): string
    {
        $directory = public_path('uploads/avatars');
        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        $fileName = uniqid('avatar_', true).'.'.$file->getClientOriginalExtension();
        $file->move($directory, $fileName);

        return 'uploads/avatars/'.$fileName;
    }

    private function deleteAvatar(?string $avatarPath): void
    {
        if (! $avatarPath) {
            return;
        }

        $fullPath = public_path($avatarPath);
        if (is_file($fullPath)) {
            @unlink($fullPath);
        }
    }

    private function nullIfBlank(mixed $value): mixed
    {
        if (! is_string($value)) {
            return $value;
        }

        $clean = trim($value);

        return $clean === '' ? null : $clean;
    }
}



