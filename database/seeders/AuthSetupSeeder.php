<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\SuperAdminAccount;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUserRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthSetupSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            'owner',
            'super admin',
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
            'super_admin.manage',
            'workspace.manage',
            'subscription.manage',
        ];

        foreach ($permissions as $permissionName) {
            Permission::query()->updateOrCreate(
                ['name' => $permissionName],
                ['guard_name' => 'web']
            );
        }

        $owner = User::query()->updateOrCreate(
            ['email' => 'owner@yourcompany.com'],
            [
                'name' => 'Owner',
                'password' => Hash::make('password'),
                'type' => 'owner',
                'account_level' => 'owner',
                'is_active' => 1,
                'email_verified_at' => now(),
            ]
        );

        $superAdmin = User::query()->updateOrCreate(
            ['email' => 'superadmin@miutx.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'type' => 'super admin',
                'account_level' => 'super_admin',
                'is_active' => 1,
                'email_verified_at' => now(),
            ]
        );

        $masterAdmin = User::query()->updateOrCreate(
            ['email' => 'masteradmin@miutx.com'],
            [
                'name' => 'Master Admin',
                'password' => Hash::make('password'),
                'type' => 'master admin',
                'account_level' => 'master_admin',
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
                'account_level' => 'admin',
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
                'account_level' => 'accountant',
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
                'account_level' => 'employee',
                'is_active' => 1,
                'email_verified_at' => now(),
            ]
        );

        $this->attachRole($owner, 'owner');
        $this->attachRole($superAdmin, 'super admin');
        $this->attachRole($masterAdmin, 'master admin');
        $this->attachRole($admin, 'admin');
        $this->attachRole($accountant, 'accountant');
        $this->attachRole($employee, 'employee');

        $this->syncRolePermissions('owner', $permissions);
        $this->syncRolePermissions('super admin', ['super_admin.manage', 'workspace.manage', 'subscription.manage']);
        $this->syncRolePermissions('master admin', $permissions);
        $this->syncRolePermissions('admin', ['user.view', 'user.create', 'user.update', 'user.delete', 'permission.view', 'event.view']);
        $this->syncRolePermissions('accountant', ['user.view', 'permission.view', 'event.view']);
        $this->syncRolePermissions('employee', ['event.view']);

        $superAdminAccount = SuperAdminAccount::query()->updateOrCreate(
            ['super_admin_user_id' => $superAdmin->id],
            [
                'owner_user_id' => $owner->id,
                'phone' => '01700000000',
                'address' => 'Dhaka, Bangladesh',
                'status' => 'active',
                'subscription_starts_at' => now(),
                'subscription_ends_at' => now()->addMonths(6),
                'billing_cycle_days' => 30,
            ]
        );

        $workspace = Workspace::query()->updateOrCreate(
            ['slug' => 'adency'],
            [
                'super_admin_account_id' => $superAdminAccount->id,
                'name' => 'Adency Master Admin Dashboard',
                'status' => 'active',
                'subscription_starts_at' => now(),
                'subscription_ends_at' => now()->addMonths(6),
            ]
        );

        $this->attachWorkspaceRole($workspace->id, $masterAdmin->id, 'master_admin');
        $this->attachWorkspaceRole($workspace->id, $admin->id, 'admin');
        $this->attachWorkspaceRole($workspace->id, $accountant->id, 'accountant');
        $this->attachWorkspaceRole($workspace->id, $employee->id, 'employee');

        User::query()->whereIn('id', [$masterAdmin->id, $admin->id, $accountant->id, $employee->id])
            ->update(['current_workspace_id' => $workspace->id]);
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

    private function attachWorkspaceRole(int $workspaceId, int $userId, string $role): void
    {
        WorkspaceUserRole::query()->updateOrCreate(
            ['workspace_id' => $workspaceId, 'user_id' => $userId],
            ['role' => $role]
        );
    }
}
