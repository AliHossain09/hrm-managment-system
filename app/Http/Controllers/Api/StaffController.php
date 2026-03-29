<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreStaffUserRequest;
use App\Http\Requests\Api\UpdateRolePermissionsRequest;
use App\Http\Requests\Api\UpdateStaffUserRequest;
use App\Models\Role;
use App\Models\User;
use App\Services\StaffService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        return $this->successResponse($staffService->presentUser($user), 'User created successfully.', 201);
    }

    public function updateUser(UpdateStaffUserRequest $request, User $user, StaffService $staffService): JsonResponse
    {
        $updated = $staffService->updateUser($user, $request->validated());

        return $this->successResponse($staffService->presentUser($updated), 'User updated successfully.');
    }

    public function deleteUser(Request $request, User $user, StaffService $staffService): JsonResponse
    {
        if ((int) $request->user()->id === (int) $user->id) {
            return $this->errorResponse('You cannot delete your own account.', 422);
        }

        $staffService->deleteUser($user);

        return $this->successResponse(null, 'User deleted successfully.');
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
