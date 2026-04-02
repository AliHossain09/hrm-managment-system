<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreStaffUserRequest;
use App\Http\Requests\Api\UpdateEmployeeDetailsRequest;
use App\Http\Requests\Api\UpdateRolePermissionsRequest;
use App\Http\Requests\Api\UpdateStaffUserRequest;
use App\Models\Role;
use App\Models\User;
use App\Services\AuthService;
use App\Services\StaffService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class StaffController extends Controller
{
    use RespondsWithMessages;

    public function users(Request $request, StaffService $staffService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();

        return $this->successResponse([
            'users' => $staffService->users($currentUser),
        ], 'Staff users loaded.');
    }

    public function employees(Request $request, StaffService $staffService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();

        return $this->successResponse([
            'employees' => $staffService->employeeRecords($currentUser),
        ], 'Employee records loaded.');
    }

    public function storeUser(StoreStaffUserRequest $request, StaffService $staffService, AuthService $authService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();

        $roleName = (string) $request->validated('role_name');
        if (! $authService->canAssignUserRole($currentUser, $roleName)) {
            return $this->errorResponse('You cannot assign this role.', 403);
        }

        $user = $staffService->createUser($request->validated(), $currentUser);

        return $this->successResponse($staffService->presentUser($user), 'User created successfully.', 201);
    }

    public function updateUser(UpdateStaffUserRequest $request, User $user, StaffService $staffService, AuthService $authService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();

        if ($currentUser->current_workspace_id && (int) $currentUser->current_workspace_id !== (int) $user->current_workspace_id) {
            return $this->errorResponse('You cannot edit user from another workspace.', 403);
        }

        if (! $authService->canManageUserAccount($currentUser, $user)) {
            return $this->errorResponse('You cannot edit this account.', 403);
        }

        $roleName = (string) $request->validated('role_name');
        if (! $authService->canAssignUserRole($currentUser, $roleName)) {
            return $this->errorResponse('You cannot assign this role.', 403);
        }

        $updated = $staffService->updateUser($user, $request->validated());

        return $this->successResponse($staffService->presentUser($updated), 'User updated successfully.');
    }

    public function updateEmployee(UpdateEmployeeDetailsRequest $request, User $user, StaffService $staffService, AuthService $authService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();

        if ($currentUser->current_workspace_id && (int) $currentUser->current_workspace_id !== (int) $user->current_workspace_id) {
            return $this->errorResponse('You cannot edit employee from another workspace.', 403);
        }

        if (! $authService->canManageUserAccount($currentUser, $user)) {
            return $this->errorResponse('You cannot edit this employee.', 403);
        }

        $updated = $staffService->updateEmployeeDetails($user, $request->validated());

        return $this->successResponse($staffService->presentUser($updated), 'Employee details updated successfully.');
    }

    public function deleteUser(Request $request, User $user, StaffService $staffService, AuthService $authService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();

        if ((int) $currentUser->id === (int) $user->id) {
            return $this->errorResponse('You cannot delete your own account.', 422);
        }

        if ($currentUser->current_workspace_id && (int) $currentUser->current_workspace_id !== (int) $user->current_workspace_id) {
            return $this->errorResponse('You cannot delete user from another workspace.', 403);
        }

        if (! $authService->canManageUserAccount($currentUser, $user)) {
            return $this->errorResponse('You cannot delete this account.', 403);
        }

        $staffService->deleteUser($user);

        return $this->successResponse(null, 'User deleted successfully.');
    }

    public function roles(Request $request, StaffService $staffService, AuthService $authService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();

        $data = $staffService->rolesWithPermissions();
        $allRoles = collect($data['roles']);
        $allPermissions = collect($data['permissions']);

        $isMaster = $authService->isMasterAdmin($currentUser);
        $canDelegate = ! $isMaster && $authService->canDelegatePermissionManagement($currentUser);
        $currentRole = $authService->normalizedPrimaryRole($currentUser);

        $visibleRoles = $this->filterVisibleRoles($allRoles, $isMaster, $canDelegate, $currentRole)
            ->map(function (array $role) use ($isMaster, $canDelegate, $authService, $currentUser): array {
                $normalized = strtolower(trim($role['name']));

                $canEdit = $isMaster || ($canDelegate && ($normalized === 'accountant' || $normalized === 'employee'));
                $role['can_edit'] = $canEdit;
                $role['can_assign'] = $authService->canAssignUserRole($currentUser, $normalized);

                return $role;
            })
            ->values();

        $visiblePermissionNames = collect();

        if ($isMaster || $canDelegate) {
            $visiblePermissionNames = $allPermissions->pluck('name');
        } else {
            $visiblePermissionNames = $visibleRoles
                ->flatMap(fn (array $role) => $role['permissions'] ?? [])
                ->unique()
                ->values();
        }

        $filteredPermissions = $allPermissions
            ->filter(fn (array $permission): bool => $visiblePermissionNames->contains($permission['name']))
            ->values();

        return $this->successResponse([
            'permissions' => $filteredPermissions,
            'roles' => $visibleRoles,
        ], 'Roles and permissions loaded.');
    }

    public function updateRolePermissions(Role $role, UpdateRolePermissionsRequest $request, StaffService $staffService, AuthService $authService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();

        if (! $authService->canManageRolePermissions($currentUser, $role)) {
            return $this->errorResponse('You do not have permission to update this role.', 403);
        }

        $updated = $staffService->syncRolePermissions($role, $request->validated('permissions'));

        return $this->successResponse([
            'id' => $updated->id,
            'name' => $updated->name,
            'permissions' => $updated->permissions->pluck('name')->values()->all(),
        ], 'Role permissions updated successfully.');
    }

    private function filterVisibleRoles(Collection $roles, bool $isMaster, bool $canDelegate, string $currentRole): Collection
    {
        if ($isMaster) {
            return $roles;
        }

        if ($canDelegate) {
            return $roles->filter(function (array $role) use ($currentRole): bool {
                $name = strtolower(trim($role['name']));

                return $name === $currentRole || $name === 'accountant' || $name === 'employee';
            });
        }

        return $roles->filter(fn (array $role): bool => strtolower(trim($role['name'])) === $currentRole);
    }
}
