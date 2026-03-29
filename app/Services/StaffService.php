<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class StaffService
{
    public function users(): array
    {
        return User::query()
            ->with(['roles:id,name'])
            ->latest('id')
            ->get()
            ->map(fn (User $user): array => $this->mapUser($user))
            ->toArray();
    }

    public function createUser(array $payload): User
    {
        $role = Role::query()->where('name', $payload['role_name'])->firstOrFail();
        $normalizedRole = Str::of($role->name)->lower()->replace('_', ' ')->value();

        $avatarPath = null;
        if (isset($payload['avatar']) && $payload['avatar'] instanceof UploadedFile) {
            $avatarPath = $this->storeAvatar($payload['avatar']);
        }

        $user = User::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'password' => Hash::make($payload['password']),
            'type' => $normalizedRole,
            'avatar' => $avatarPath,
            'is_active' => 1,
            'email_verified_at' => now(),
        ]);

        $this->syncUserRole($user, $role);

        return $user->load('roles:id,name');
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

        $updates = [
            'name' => $payload['name'],
            'email' => $payload['email'],
            'type' => $normalizedRole,
            'avatar' => $avatarPath,
        ];

        if (! empty($payload['password'])) {
            $updates['password'] = Hash::make($payload['password']);
        }

        $user->update($updates);
        $this->syncUserRole($user, $role);

        return $user->load('roles:id,name');
    }

    public function deleteUser(User $user): void
    {
        $this->deleteAvatar($user->avatar);

        DB::table('model_has_roles')
            ->where('model_type', User::class)
            ->where('model_id', $user->id)
            ->delete();

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
        return $this->mapUser($user->load('roles:id,name'));
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

    private function mapUser(User $user): array
    {
        $roleName = $user->roles->first()?->name ?? ($user->type ?: 'N/A');

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'type' => $user->type,
            'role' => $roleName,
            'avatar' => $user->avatar,
            'avatar_url' => $user->avatar ? asset($user->avatar) : null,
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
}
