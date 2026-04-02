<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

        if (! app(SubscriptionAccessService::class)->canLogin($user)) {
            return [
                'ok' => false,
                'message' => 'Your subscription is inactive or expired. Please contact the owner.',
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
        $this->syncCurrentWorkspace($authUser);
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

        if (! app(SubscriptionAccessService::class)->canLogin($user)) {
            return [
                'ok' => false,
                'message' => 'Your subscription is inactive or expired. Please contact the owner.',
            ];
        }

        $plainToken = Str::random(80);
        $this->syncCurrentWorkspace($user);

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
            'workspace' => $this->workspacePayload($user),
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
        $normalized = $this->normalizeRole($user->primaryRoleName().' '.$user->account_level);

        $employeeKeywords = ['employee', 'staff'];
        foreach ($employeeKeywords as $keyword) {
            if (str_contains($normalized, $keyword)) {
                return 'employee';
            }
        }

        return 'admin';
    }

    public function dashboardRouteFor(User $user): string
    {
        return $this->roleGroupFor($user) === 'employee'
            ? 'dashboard.employee'
            : 'dashboard.admin';
    }

    public function isMasterAdmin(User $user): bool
    {
        $normalized = $this->normalizeRole($user->primaryRoleName().' '.$user->account_level);

        return str_contains($normalized, 'master admin');
    }

    public function isOwner(User $user): bool
    {
        return $this->normalizeRole($user->account_level) === 'owner';
    }

    public function isSuperAdmin(User $user): bool
    {
        return $this->normalizeRole($user->account_level) === 'super admin';
    }

    public function permissionNamesFor(User $user): array
    {
        return DB::table('permissions')
            ->join('role_has_permissions', 'permissions.id', '=', 'role_has_permissions.permission_id')
            ->join('model_has_roles', 'role_has_permissions.role_id', '=', 'model_has_roles.role_id')
            ->where('model_has_roles.model_type', User::class)
            ->where('model_has_roles.model_id', $user->id)
            ->pluck('permissions.name')
            ->unique()
            ->values()
            ->all();
    }

    public function hasPermission(User $user, string $permission): bool
    {
        return in_array($permission, $this->permissionNamesFor($user), true);
    }

    public function normalizedPrimaryRole(User $user): string
    {
        return $this->normalizeRole($user->primaryRoleName());
    }

    public function canDelegatePermissionManagement(User $user): bool
    {
        if ($this->isMasterAdmin($user)) {
            return true;
        }

        $role = $this->normalizedPrimaryRole($user);

        if (! str_contains($role, 'admin') || str_contains($role, 'master admin')) {
            return false;
        }

        return $this->hasPermission($user, 'permission.update');
    }

    public function canManageRolePermissions(User $actor, Role $targetRole): bool
    {
        if ($this->isMasterAdmin($actor)) {
            return true;
        }

        if (! $this->canDelegatePermissionManagement($actor)) {
            return false;
        }

        $target = $this->normalizeRole($targetRole->name);

        if (str_contains($target, 'master admin') || $target === 'admin') {
            return false;
        }

        return $target === 'accountant' || $target === 'employee';
    }

    public function canAssignUserRole(User $actor, string $targetRoleName): bool
    {
        $target = $this->normalizeRole($targetRoleName);

        if ($target === 'owner' || $target === 'super admin' || $target === 'master admin') {
            return false;
        }

        if ($this->isOwner($actor) || $this->isSuperAdmin($actor)) {
            return false;
        }

        if ($this->isMasterAdmin($actor)) {
            return in_array($target, ['admin', 'accountant', 'employee'], true);
        }

        $actorRole = $this->normalizedPrimaryRole($actor);
        if (str_contains($actorRole, 'admin')) {
            return in_array($target, ['accountant', 'employee'], true);
        }

        return false;
    }

    public function canManageUserAccount(User $actor, User $target): bool
    {
        if ((int) $actor->id === (int) $target->id) {
            return false;
        }

        $targetRole = $this->normalizedPrimaryRole($target);

        if (in_array($targetRole, ['owner', 'super admin', 'master admin'], true)) {
            return false;
        }

        if ($this->isOwner($actor) || $this->isSuperAdmin($actor)) {
            return false;
        }

        if ($this->isMasterAdmin($actor)) {
            return in_array($targetRole, ['admin', 'accountant', 'employee'], true);
        }

        $actorRole = $this->normalizedPrimaryRole($actor);
        if (str_contains($actorRole, 'admin')) {
            return in_array($targetRole, ['accountant', 'employee'], true);
        }

        return false;
    }
    public function workspacePayload(User $user): ?array
    {
        $workspace = app(SubscriptionAccessService::class)->resolveWorkspaceForUser($user);

        if (! $workspace) {
            return null;
        }

        return [
            'id' => $workspace->id,
            'name' => $workspace->name,
            'slug' => $workspace->slug,
            'logo' => $workspace->logo,
            'logo_url' => $workspace->logo ? asset($workspace->logo) : null,
            'status' => $workspace->status,
        ];
    }

    private function syncCurrentWorkspace(User $user): void
    {
        $workspace = app(SubscriptionAccessService::class)->resolveWorkspaceForUser($user);
        if (! $workspace) {
            return;
        }

        if ((int) $user->current_workspace_id !== (int) $workspace->id) {
            $user->forceFill(['current_workspace_id' => $workspace->id])->save();
            $user->refresh();
        }
    }

    private function normalizeRole(?string $value): string
    {
        return Str::of((string) $value)
            ->lower()
            ->replace('_', ' ')
            ->replace('-', ' ')
            ->squish()
            ->value();
    }
}



