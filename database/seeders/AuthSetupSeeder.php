<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthSetupSeeder extends Seeder
{
    /**
     * Seed authentication essentials: roles + master admin/admin users.
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

        $this->attachRole($masterAdmin, 'master admin');
        $this->attachRole($admin, 'admin');
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
}
