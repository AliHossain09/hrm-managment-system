<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthSetupSeeder extends Seeder
{
    /**
     * Seed authentication essentials: roles + default users.
     */
    public function run(): void
    {
        $roles = [
            'master admin',
            'admin',
            'accountant',
            'employee',
        ];

        foreach ($roles as $roleName) {
            Role::query()->updateOrCreate(
                ['name' => $roleName, 'guard_name' => 'web', 'created_by' => 0],
                ['updated_at' => now(), 'created_at' => now()]
            );
        }

        $permissions = [
            'user.view',
            'user.create',
            'user.update',
            'user.delete',
            'permission.view',
            'permission.update',
            'event.view',
            'event.create',
            'event.update',
            'event.delete',
        ];

        foreach ($permissions as $permissionName) {
            Permission::query()->updateOrCreate(
                ['name' => $permissionName],
                ['guard_name' => 'web']
            );
        }

        $masterAdmin = User::query()->updateOrCreate(
            ['email' => 'masteradmin@miutx.com'],
            [
                'name' => 'Master Admin',
                'password' => Hash::make('password'),
                'type' => 'master admin',
                'is_active' => 1,
                'email_verified_at' => now(),
            ]
        );

        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@miutx.com'],
            [
                'name' => 'Admin',
                'password' => Hash::make('password'),
                'type' => 'admin',
                'is_active' => 1,
                'email_verified_at' => now(),
            ]
        );

        $accountant = User::query()->updateOrCreate(
            ['email' => 'accountant@miutx.com'],
            [
                'name' => 'Accountant',
                'password' => Hash::make('password'),
                'type' => 'accountant',
                'is_active' => 1,
                'email_verified_at' => now(),
            ]
        );

        $employee = User::query()->updateOrCreate(
            ['email' => 'employee@miutx.com'],
            [
                'name' => 'Employee',
                'password' => Hash::make('password'),
                'type' => 'employee',
                'is_active' => 1,
                'email_verified_at' => now(),
            ]
        );

        $this->attachRole($masterAdmin, 'master admin');
        $this->attachRole($admin, 'admin');
        $this->attachRole($accountant, 'accountant');
        $this->attachRole($employee, 'employee');

        $this->syncRolePermissions('master admin', $permissions);
        $this->syncRolePermissions('admin', ['user.view', 'user.create', 'user.update', 'user.delete', 'permission.view', 'event.view']);
        $this->syncRolePermissions('accountant', ['user.view', 'permission.view', 'event.view']);
        $this->syncRolePermissions('employee', ['event.view']);
    }

    private function attachRole(User $user, string $roleName): void
    {
        $role = Role::query()->where('name', $roleName)->first();

        if (! $role) {
            return;
        }

        DB::table('model_has_roles')->updateOrInsert([
            'role_id' => $role->id,
            'model_type' => User::class,
            'model_id' => $user->id,
        ], []);
    }

    private function syncRolePermissions(string $roleName, array $permissionNames): void
    {
        $role = Role::query()->where('name', $roleName)->first();
        if (! $role) {
            return;
        }

        $permissionIds = Permission::query()->whereIn('name', $permissionNames)->pluck('id')->all();
        $role->permissions()->sync($permissionIds);
    }
}
