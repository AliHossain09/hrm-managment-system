<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthService
{
    public function loginForWeb(array $credentials, bool $remember = false): array
    {
        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return [
                'ok' => false,
                'message' => 'Invalid email or password.',
            ];
        }

        if (! $user->is_active) {
            return [
                'ok' => false,
                'message' => 'Your account is inactive. Please contact admin.',
            ];
        }

        if (! Auth::attempt(['email' => $credentials['email'], 'password' => $credentials['password']], $remember)) {
            return [
                'ok' => false,
                'message' => 'Unable to login right now. Try again.',
            ];
        }

        /** @var User $authUser */
        $authUser = Auth::user();
        $authUser->forceFill(['last_login_at' => now()])->save();

        return [
            'ok' => true,
            'message' => 'Login successful.',
            'route' => $this->dashboardRouteFor($authUser),
            'user' => $authUser,
        ];
    }

    public function logoutWeb(): void
    {
        Auth::guard('web')->logout();
    }

    public function loginForApi(array $credentials): array
    {
        $user = User::query()->where('email', $credentials['email'])->first();

        if (! $user || ! Hash::check($credentials['password'], $user->password)) {
            return [
                'ok' => false,
                'message' => 'Invalid email or password.',
            ];
        }

        if (! $user->is_active) {
            return [
                'ok' => false,
                'message' => 'Your account is inactive. Please contact admin.',
            ];
        }

        $plainToken = Str::random(80);

        $user->forceFill([
            'api_token' => hash('sha256', $plainToken),
            'last_login_at' => now(),
        ])->save();

        return [
            'ok' => true,
            'message' => 'Login successful.',
            'token' => $plainToken,
            'token_type' => 'Bearer',
            'role_group' => $this->roleGroupFor($user),
            'dashboard_route' => $this->dashboardRouteFor($user),
            'user' => $user,
        ];
    }

    public function logoutApi(User $user): void
    {
        $user->forceFill(['api_token' => null])->save();
    }

    public function userByApiToken(?string $token): ?User
    {
        if (! $token) {
            return null;
        }

        $hashed = hash('sha256', $token);

        return User::query()
            ->where('api_token', $hashed)
            ->orWhere('api_token', $token)
            ->first();
    }

    public function roleGroupFor(User $user): string
    {
        $normalized = $this->normalizeRole($user->primaryRoleName());

        $employeeKeywords = ['employee', 'staff'];
        foreach ($employeeKeywords as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return 'employee';
            }
        }

        $adminKeywords = [
            'super admin',
            'master admin',
            'masteradmin',
            'accountant',
            'company',
            'hrm',
            'managerial',
            'admin',
        ];

        foreach ($adminKeywords as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return 'admin';
            }
        }

        return $user->isEmployee() ? 'employee' : 'admin';
    }

    public function dashboardRouteFor(User $user): string
    {
        return $this->roleGroupFor($user) === 'employee'
            ? 'dashboard.employee'
            : 'dashboard.admin';
    }

    private function normalizeRole(?string $value): string
    {
        $normalized = Str::of((string) $value)
            ->lower()
            ->replace('_', ' ')
            ->replace('-', ' ')
            ->squish()
            ->value();

        return $normalized;
    }
}

