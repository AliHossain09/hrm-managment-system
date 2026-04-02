<?php

namespace App\Services;

use App\Models\SuperAdminAccount;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Support\Carbon;

class SubscriptionAccessService
{
    public function canLogin(User $user): bool
    {
        if (! $user->is_active) {
            return false;
        }

        if ($this->isOwner($user)) {
            return true;
        }

        $superAdminAccount = $this->resolveSuperAdminAccount($user);

        if ($superAdminAccount && ! $this->isSubscriptionActive($superAdminAccount->status, $superAdminAccount->subscription_ends_at)) {
            return false;
        }

        $workspace = $this->resolveWorkspaceForUser($user);
        if (! $workspace) {
            return true;
        }

        if (! $this->isSubscriptionActive($workspace->status, $workspace->subscription_ends_at)) {
            return false;
        }

        if ($workspace->superAdminAccount && ! $this->isSubscriptionActive($workspace->superAdminAccount->status, $workspace->superAdminAccount->subscription_ends_at)) {
            return false;
        }

        return true;
    }

    public function resolveWorkspaceForUser(User $user): ?Workspace
    {
        if ($user->current_workspace_id) {
            return Workspace::query()->with('superAdminAccount')->find($user->current_workspace_id);
        }

        $membership = $user->workspaceRoles()->orderBy('id')->first();
        if (! $membership) {
            return null;
        }

        return Workspace::query()->with('superAdminAccount')->find($membership->workspace_id);
    }

    public function resolveSuperAdminAccount(User $user): ?SuperAdminAccount
    {
        $direct = SuperAdminAccount::query()->where('super_admin_user_id', $user->id)->first();
        if ($direct) {
            return $direct;
        }

        $workspace = $this->resolveWorkspaceForUser($user);
        if (! $workspace) {
            return null;
        }

        return $workspace->superAdminAccount;
    }

    public function isOwner(User $user): bool
    {
        $level = strtolower((string) $user->account_level);

        return $level === 'owner';
    }

    private function isSubscriptionActive(?string $status, $endsAt): bool
    {
        if (strtolower((string) $status) !== 'active') {
            return false;
        }

        if (! $endsAt) {
            return true;
        }

        return Carbon::parse($endsAt)->greaterThanOrEqualTo(now());
    }
}
