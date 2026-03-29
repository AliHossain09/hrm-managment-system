<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreStaffUserRequest;
use App\Http\Requests\Api\UpdateRolePermissionsRequest;
use App\Models\Role;
use App\Services\StaffService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;

class StaffController extends Controller
{
    use RespondsWithMessages;

    public function users(StaffService $staffService): JsonResponse
    {
        return $this->successResponse([
            'users' => $staffService->users(),
        ], 'Staff users loaded.');
    }

    public function storeUser(StoreStaffUserRequest $request, StaffService $staffService): JsonResponse
    {
        $user = $staffService->createUser($request->validated());

        return $this->successResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->roles->first()?->name ?? $user->type,
            'last_login_at' => optional($user->last_login_at)->format('Y-m-d H:i:s'),
        ], 'User created successfully.', 201);
    }

    public function roles(StaffService $staffService): JsonResponse
    {
        return $this->successResponse($staffService->rolesWithPermissions(), 'Roles and permissions loaded.');
    }

    public function updateRolePermissions(Role $role, UpdateRolePermissionsRequest $request, StaffService $staffService): JsonResponse
    {
        $updated = $staffService->syncRolePermissions($role, $request->validated('permissions'));

        return $this->successResponse([
            'id' => $updated->id,
            'name' => $updated->name,
            'permissions' => $updated->permissions->pluck('name')->values()->all(),
        ], 'Role permissions updated successfully.');
    }
}
