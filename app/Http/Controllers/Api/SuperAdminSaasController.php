<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreWorkspaceRequest;
use App\Http\Requests\Api\UpdateWorkspaceRequest;
use App\Models\Role;
use App\Models\SuperAdminAccount;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceUserRole;
use App\Services\AuthService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SuperAdminSaasController extends Controller
{
    use RespondsWithMessages;

    public function indexWorkspaces(Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $superAdmin = $this->resolveSuperAdminAccount($user, $authService);
        if (! $superAdmin) {
            return $this->errorResponse('Only super admin can access this resource.', 403);
        }

        $rows = Workspace::query()
            ->with(['workspaceUserRoles.user'])
            ->withCount('users')
            ->where('super_admin_account_id', $superAdmin->id)
            ->latest('id')
            ->get()
            ->map(function (Workspace $workspace): array {
                $masterRole = $workspace->workspaceUserRoles->firstWhere('role', 'master_admin');
                $masterUser = $masterRole?->user;

                return [
                    'workspace_id' => $workspace->id,
                    'id' => $masterUser?->id,
                    'email' => $masterUser?->email,
                    'phone' => $masterUser?->phone,
                    'address' => $masterUser?->address,
                    'password' => '********',
                    'image' => $workspace->logo,
                    'image_url' => $workspace->logo ? asset($workspace->logo) : null,
                    'name' => $workspace->name,
                    'slug' => $workspace->slug,
                    'status' => $workspace->status,
                    'subscription_starts_at' => optional($workspace->subscription_starts_at)->format('Y-m-d H:i:s'),
                    'subscription_ends_at' => optional($workspace->subscription_ends_at)->format('Y-m-d H:i:s'),
                    'users_count' => $workspace->users_count,
                ];
            })
            ->values();

        return $this->successResponse(['workspaces' => $rows], 'Workspaces loaded.');
    }

    public function storeWorkspace(StoreWorkspaceRequest $request, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $superAdmin = $this->resolveSuperAdminAccount($user, $authService);
        if (! $superAdmin) {
            return $this->errorResponse('Only super admin can create workspace.', 403);
        }

        $payload = $request->validated();
        $workspaceLogoPath = null;

        if ($request->hasFile('workspace_logo')) {
            $workspaceLogoPath = 'storage/'.$request->file('workspace_logo')->store('workspace-logos', 'public');
        }

        $workspace = DB::transaction(function () use ($payload, $superAdmin, $workspaceLogoPath) {
            $workspaceName = $payload['name'];
            $workspace = Workspace::query()->create([
                'super_admin_account_id' => $superAdmin->id,
                'name' => $workspaceName,
                'slug' => $this->generateUniqueSlug($workspaceName),
                'logo' => $workspaceLogoPath,
                'status' => $payload['status'] ?? 'active',
                'subscription_starts_at' => now(),
                'subscription_ends_at' => $superAdmin->subscription_ends_at,
            ]);

            $masterUser = User::query()->create([
                'name' => $this->nameFromEmail($payload['master_admin_email']),
                'email' => $payload['master_admin_email'],
                'phone' => $payload['master_admin_phone'] ?? null,
                'address' => $payload['master_admin_address'] ?? null,
                'password' => Hash::make($payload['master_admin_password']),
                'type' => 'master admin',
                'account_level' => 'master_admin',
                'current_workspace_id' => $workspace->id,
                'is_active' => 1,
                'email_verified_at' => now(),
            ]);

            $role = Role::query()->where('name', 'master admin')->first();
            if ($role) {
                DB::table('model_has_roles')->updateOrInsert([
                    'role_id' => $role->id,
                    'model_type' => User::class,
                    'model_id' => $masterUser->id,
                ], []);
            }

            WorkspaceUserRole::query()->create([
                'workspace_id' => $workspace->id,
                'user_id' => $masterUser->id,
                'role' => 'master_admin',
            ]);

            return $workspace;
        });

        return $this->successResponse(['workspace_id' => $workspace->id], 'Workspace and master admin created successfully.', 201);
    }

    public function updateWorkspace(Workspace $workspace, UpdateWorkspaceRequest $request, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $superAdmin = $this->resolveSuperAdminAccount($user, $authService);
        if (! $superAdmin || (int) $workspace->super_admin_account_id !== (int) $superAdmin->id) {
            return $this->errorResponse('You cannot update this workspace.', 403);
        }

        $payload = $request->validated();

        $masterRole = WorkspaceUserRole::query()
            ->where('workspace_id', $workspace->id)
            ->where('role', 'master_admin')
            ->first();

        if (! $masterRole) {
            return $this->errorResponse('Master admin user not found for this workspace.', 422);
        }

        $masterUser = User::query()->find($masterRole->user_id);
        if (! $masterUser) {
            return $this->errorResponse('Master admin user not found.', 422);
        }

        if (isset($payload['master_admin_email'])) {
            $exists = User::query()
                ->where('email', $payload['master_admin_email'])
                ->where('id', '!=', $masterUser->id)
                ->exists();

            if ($exists) {
                return $this->errorResponse('This email is already taken.', 422);
            }
        }

        $workspaceUpdates = [];
        if (isset($payload['name'])) {
            $workspaceUpdates['name'] = $payload['name'];
            $workspaceUpdates['slug'] = $this->generateUniqueSlug($payload['name'], $workspace->id);
        }
        if (isset($payload['status'])) {
            $workspaceUpdates['status'] = $payload['status'];
        }

        if ($request->hasFile('workspace_logo')) {
            $workspaceUpdates['logo'] = 'storage/'.$request->file('workspace_logo')->store('workspace-logos', 'public');
        }

        $userUpdates = [];
        if (isset($payload['master_admin_email'])) {
            $userUpdates['email'] = $payload['master_admin_email'];
            $userUpdates['name'] = $this->nameFromEmail($payload['master_admin_email']);
        }
        if (array_key_exists('master_admin_phone', $payload)) {
            $userUpdates['phone'] = $payload['master_admin_phone'];
        }
        if (array_key_exists('master_admin_address', $payload)) {
            $userUpdates['address'] = $payload['master_admin_address'];
        }
        if (! empty($payload['master_admin_password'])) {
            $userUpdates['password'] = Hash::make($payload['master_admin_password']);
        }

        DB::transaction(function () use ($workspace, $workspaceUpdates, $masterUser, $userUpdates): void {
            if ($workspaceUpdates !== []) {
                $workspace->update($workspaceUpdates);
            }

            if ($userUpdates !== []) {
                $masterUser->update($userUpdates);
            }
        });

        return $this->successResponse(null, 'Workspace updated successfully.');
    }

    public function destroyWorkspace(Workspace $workspace, Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $superAdmin = $this->resolveSuperAdminAccount($user, $authService);
        if (! $superAdmin || (int) $workspace->super_admin_account_id !== (int) $superAdmin->id) {
            return $this->errorResponse('You cannot delete this workspace.', 403);
        }

        $workspace->delete();

        return $this->successResponse(null, 'Workspace deleted successfully.');
    }

    private function resolveSuperAdminAccount(User $user, AuthService $authService): ?SuperAdminAccount
    {
        if (! $authService->isSuperAdmin($user)) {
            return null;
        }

        return SuperAdminAccount::query()->where('super_admin_user_id', $user->id)->first();
    }

    private function generateUniqueSlug(string $name, ?int $ignoreWorkspaceId = null): string
    {
        $base = Str::slug($name);
        if ($base === '') {
            $base = 'dashboard';
        }

        $candidate = $base;
        $i = 1;

        while (Workspace::query()
            ->where('slug', $candidate)
            ->when($ignoreWorkspaceId, fn ($q) => $q->where('id', '!=', $ignoreWorkspaceId))
            ->exists()) {
            $candidate = $base.'-'.$i;
            $i++;
        }

        return $candidate;
    }

    private function nameFromEmail(string $email): string
    {
        $left = explode('@', $email)[0] ?? 'master admin';
        $left = str_replace(['.', '-', '_'], ' ', $left);

        return Str::of($left)->title()->value();
    }
}
