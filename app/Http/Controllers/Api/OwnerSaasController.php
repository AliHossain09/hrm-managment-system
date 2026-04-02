<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreOwnerSuperAdminRequest;
use App\Http\Requests\Api\UpdateOwnerSuperAdminRequest;
use App\Models\Role;
use App\Models\SuperAdminAccount;
use App\Models\User;
use App\Services\AuthService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class OwnerSaasController extends Controller
{
    use RespondsWithMessages;

    public function index(Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $owner */
        $owner = $request->user();

        if (! $authService->isOwner($owner)) {
            return $this->errorResponse('Only owner can access this resource.', 403);
        }

        $rows = SuperAdminAccount::query()
            ->with('superAdminUser:id,name,email,is_active')
            ->with(['payments' => fn ($query) => $query->latest('id')->limit(1)])
            ->withCount('workspaces')
            ->where('owner_user_id', $owner->id)
            ->latest('id')
            ->get()
            ->map(function (SuperAdminAccount $item): array {
                return [
                    'id' => $item->id,
                    'super_admin_user_id' => $item->super_admin_user_id,
                    'name' => $item->superAdminUser?->name,
                    'email' => $item->superAdminUser?->email,
                    'phone' => $item->phone,
                    'address' => $item->address,
                    'status' => $item->status,
                    'subscription_starts_at' => optional($item->subscription_starts_at)->format('Y-m-d H:i:s'),
                    'subscription_ends_at' => optional($item->subscription_ends_at)->format('Y-m-d H:i:s'),
                    'billing_cycle_days' => $item->billing_cycle_days,
                    'payment_status' => $item->payments->first()?->status ?? 'unpaid',
                    'workspaces_count' => $item->workspaces_count,
                ];
            })
            ->values();

        return $this->successResponse(['super_admins' => $rows], 'Super admins loaded.');
    }

    public function store(StoreOwnerSuperAdminRequest $request, AuthService $authService): JsonResponse
    {
        /** @var User $owner */
        $owner = $request->user();

        if (! $authService->isOwner($owner)) {
            return $this->errorResponse('Only owner can create super admin.', 403);
        }

        $payload = $request->validated();

        $item = DB::transaction(function () use ($payload, $owner) {
            $user = User::query()->create([
                'name' => $payload['name'],
                'email' => $payload['email'],
                'password' => Hash::make($payload['password']),
                'type' => 'super admin',
                'account_level' => 'super_admin',
                'is_active' => 1,
                'email_verified_at' => now(),
            ]);

            $role = Role::query()->where('name', 'super admin')->first();
            if ($role) {
                DB::table('model_has_roles')->updateOrInsert([
                    'role_id' => $role->id,
                    'model_type' => User::class,
                    'model_id' => $user->id,
                ], []);
            }

            return SuperAdminAccount::query()->create([
                'owner_user_id' => $owner->id,
                'super_admin_user_id' => $user->id,
                'phone' => $payload['phone'] ?? null,
                'address' => $payload['address'] ?? null,
                'status' => $payload['status'] ?? 'active',
                'subscription_starts_at' => $payload['subscription_starts_at'] ?? now(),
                'subscription_ends_at' => $payload['subscription_ends_at'] ?? now()->addDays((int) ($payload['billing_cycle_days'] ?? 30)),
                'billing_cycle_days' => (int) ($payload['billing_cycle_days'] ?? 30),
            ]);
        });

        return $this->successResponse(['id' => $item->id], 'Super admin created successfully.', 201);
    }

    public function update(SuperAdminAccount $superAdminAccount, UpdateOwnerSuperAdminRequest $request, AuthService $authService): JsonResponse
    {
        /** @var User $owner */
        $owner = $request->user();

        if (! $authService->isOwner($owner) || (int) $superAdminAccount->owner_user_id !== (int) $owner->id) {
            return $this->errorResponse('You cannot update this super admin.', 403);
        }

        $payload = $request->validated();

        DB::transaction(function () use ($superAdminAccount, $payload): void {
            $user = User::query()->findOrFail($superAdminAccount->super_admin_user_id);

            $userUpdates = [];
            if (array_key_exists('name', $payload)) {
                $userUpdates['name'] = $payload['name'];
            }
            if (array_key_exists('email', $payload)) {
                $userUpdates['email'] = $payload['email'];
            }
            if (! empty($payload['password'])) {
                $userUpdates['password'] = Hash::make($payload['password']);
            }

            if ($userUpdates !== []) {
                $user->update($userUpdates);
            }

            $superAdminAccount->update([
                'phone' => $payload['phone'] ?? $superAdminAccount->phone,
                'address' => $payload['address'] ?? $superAdminAccount->address,
                'status' => $payload['status'] ?? $superAdminAccount->status,
                'subscription_starts_at' => $payload['subscription_starts_at'] ?? $superAdminAccount->subscription_starts_at,
                'subscription_ends_at' => $payload['subscription_ends_at'] ?? $superAdminAccount->subscription_ends_at,
                'billing_cycle_days' => (int) ($payload['billing_cycle_days'] ?? $superAdminAccount->billing_cycle_days),
            ]);
        });

        return $this->successResponse(null, 'Super admin updated successfully.');
    }

    public function destroy(SuperAdminAccount $superAdminAccount, Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $owner */
        $owner = $request->user();

        if (! $authService->isOwner($owner) || (int) $superAdminAccount->owner_user_id !== (int) $owner->id) {
            return $this->errorResponse('You cannot delete this super admin.', 403);
        }

        DB::transaction(function () use ($superAdminAccount): void {
            $user = User::query()->find($superAdminAccount->super_admin_user_id);
            $superAdminAccount->delete();

            if ($user) {
                DB::table('model_has_roles')
                    ->where('model_type', User::class)
                    ->where('model_id', $user->id)
                    ->delete();

                $user->delete();
            }
        });

        return $this->successResponse(null, 'Super admin deleted successfully.');
    }
}

