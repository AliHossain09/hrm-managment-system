<?php

namespace App\Services;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
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
            ->map(function (User $user): array {
                $roleName = $user->roles->first()?->name ?? ($user->type ?: 'N/A');

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'type' => $user->type,
                    'role' => $roleName,
                    'avatar' => $user->avatar,
                    'last_login_at' => optional($user->last_login_at)->format('Y-m-d H:i:s'),
                ];
            })
            ->toArray();
    }

    public function createUser(array $payload): User
    {
        $role = Role::query()->where('name', $payload['role_name'])->firstOrFail();
        $normalizedRole = Str::of($role->name)->lower()->replace('_', ' ')->value();

        $user = User::query()->create([
            'name' => $payload['name'],
            'email' => $payload['email'],
            'password' => Hash::make($payload['password']),
            'type' => $normalizedRole,
            'is_active' => 1,
            'email_verified_at' => now(),
        ]);

        DB::table('model_has_roles')->updateOrInsert([
            'role_id' => $role->id,
            'model_type' => User::class,
            'model_id' => $user->id,
        ], []);

        return $user->load('roles:id,name');
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
}
