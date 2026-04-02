<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreStaffUserRequest;
use App\Http\Requests\Api\UpdateEmployeeDetailsRequest;
use App\Http\Requests\Api\UpdateRolePermissionsRequest;
use App\Http\Requests\Api\UpdateStaffUserRequest;
use App\Models\AttendanceRecord;
use App\Models\Role;
use App\Models\User;
use App\Services\AuthService;
use App\Services\StaffService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;

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

    public function attendanceIndex(Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();
        $userId = (int) $request->query('user_id', 0);

        if ($userId > 0) {
            $targetUser = User::query()->find($userId);
            if (! $targetUser) {
                return $this->errorResponse('Employee not found.', 404);
            }

            if ($currentUser->current_workspace_id && (int) $currentUser->current_workspace_id !== (int) $targetUser->current_workspace_id) {
                return $this->errorResponse('You cannot view attendance from another workspace.', 403);
            }

            if (! $authService->canManageUserAccount($currentUser, $targetUser)) {
                return $this->errorResponse('You cannot view this attendance data.', 403);
            }

            $records = AttendanceRecord::query()
                ->with('user:id,name,email,avatar,current_workspace_id')
                ->where('workspace_id', (int) $targetUser->current_workspace_id)
                ->where('user_id', (int) $targetUser->id)
                ->orderByDesc('attendance_date')
                ->orderByDesc('id')
                ->get()
                ->map(fn (AttendanceRecord $record): array => $this->presentAttendance($record))
                ->values();
        } else {
            $workspaceId = (int) ($currentUser->current_workspace_id ?? 0);
            if ($workspaceId <= 0) {
                return $this->errorResponse('Workspace not found for this user.', 422);
            }

            $records = AttendanceRecord::query()
                ->with('user:id,name,email,avatar,current_workspace_id')
                ->where('workspace_id', $workspaceId)
                ->orderByDesc('attendance_date')
                ->orderByDesc('id')
                ->get()
                ->filter(function (AttendanceRecord $record) use ($currentUser, $authService): bool {
                    $targetUser = $record->user;
                    if (! $targetUser) {
                        return false;
                    }

                    return $authService->canManageUserAccount($currentUser, $targetUser);
                })
                ->map(fn (AttendanceRecord $record): array => $this->presentAttendance($record))
                ->values();
        }

        return $this->successResponse([
            'records' => $records,
        ], 'Attendance records loaded.');
    }

    public function attendanceStore(Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'attendance_date' => ['required', 'date'],
            'status' => ['required', 'string', Rule::in(['present', 'leave', 'absent'])],
            'check_in' => ['nullable', 'date_format:H:i'],
            'check_out' => ['nullable', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $targetUser = User::query()->findOrFail((int) $validated['user_id']);
        if ($currentUser->current_workspace_id && (int) $currentUser->current_workspace_id !== (int) $targetUser->current_workspace_id) {
            return $this->errorResponse('You cannot create attendance for another workspace.', 403);
        }

        if (! $authService->canManageUserAccount($currentUser, $targetUser)) {
            return $this->errorResponse('You cannot create attendance for this user.', 403);
        }

        $workspaceId = (int) $targetUser->current_workspace_id;
        $exists = AttendanceRecord::query()
            ->where('workspace_id', $workspaceId)
            ->where('user_id', (int) $targetUser->id)
            ->where('attendance_date', $validated['attendance_date'])
            ->exists();

        if ($exists) {
            return $this->errorResponse('Attendance already exists for this date.', 422);
        }

        $record = AttendanceRecord::query()->create([
            'workspace_id' => $workspaceId,
            'user_id' => (int) $targetUser->id,
            'attendance_date' => $validated['attendance_date'],
            'check_in' => $validated['status'] === 'present' ? ($validated['check_in'] ?? null) : null,
            'check_out' => $validated['status'] === 'present' ? ($validated['check_out'] ?? null) : null,
            'status' => $validated['status'],
            'remarks' => $validated['notes'] ?? null,
        ]);

        return $this->successResponse([
            'record' => $this->presentAttendance($record->load('user:id,name,email,avatar,current_workspace_id')),
        ], 'Attendance created successfully.', 201);
    }

    public function attendanceUpdate(Request $request, AttendanceRecord $attendanceRecord, AuthService $authService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();
        $targetUser = User::query()->find((int) $attendanceRecord->user_id);

        if (! $targetUser) {
            return $this->errorResponse('Employee not found.', 404);
        }

        if ($currentUser->current_workspace_id && (int) $currentUser->current_workspace_id !== (int) $attendanceRecord->workspace_id) {
            return $this->errorResponse('You cannot update attendance from another workspace.', 403);
        }

        if (! $authService->canManageUserAccount($currentUser, $targetUser)) {
            return $this->errorResponse('You cannot update this attendance.', 403);
        }

        $validated = $request->validate([
            'attendance_date' => ['required', 'date'],
            'status' => ['required', 'string', Rule::in(['present', 'leave', 'absent'])],
            'check_in' => ['nullable', 'date_format:H:i'],
            'check_out' => ['nullable', 'date_format:H:i'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $exists = AttendanceRecord::query()
            ->where('workspace_id', (int) $attendanceRecord->workspace_id)
            ->where('user_id', (int) $attendanceRecord->user_id)
            ->where('attendance_date', $validated['attendance_date'])
            ->where('id', '!=', (int) $attendanceRecord->id)
            ->exists();

        if ($exists) {
            return $this->errorResponse('Attendance already exists for this date.', 422);
        }

        $attendanceRecord->update([
            'attendance_date' => $validated['attendance_date'],
            'check_in' => $validated['status'] === 'present' ? ($validated['check_in'] ?? null) : null,
            'check_out' => $validated['status'] === 'present' ? ($validated['check_out'] ?? null) : null,
            'status' => $validated['status'],
            'remarks' => $validated['notes'] ?? null,
        ]);

        return $this->successResponse([
            'record' => $this->presentAttendance($attendanceRecord->fresh()->load('user:id,name,email,avatar,current_workspace_id')),
        ], 'Attendance updated successfully.');
    }

    public function attendanceDelete(Request $request, AttendanceRecord $attendanceRecord, AuthService $authService): JsonResponse
    {
        /** @var User $currentUser */
        $currentUser = $request->user();
        $targetUser = User::query()->find((int) $attendanceRecord->user_id);

        if (! $targetUser) {
            return $this->errorResponse('Employee not found.', 404);
        }

        if ($currentUser->current_workspace_id && (int) $currentUser->current_workspace_id !== (int) $attendanceRecord->workspace_id) {
            return $this->errorResponse('You cannot delete attendance from another workspace.', 403);
        }

        if (! $authService->canManageUserAccount($currentUser, $targetUser)) {
            return $this->errorResponse('You cannot delete this attendance.', 403);
        }

        $attendanceRecord->delete();

        return $this->successResponse(null, 'Attendance deleted successfully.');
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

    private function presentAttendance(AttendanceRecord $record): array
    {
        $overtimeMinutes = 0;
        if ($record->status === 'present' && $record->check_in && $record->check_out) {
            $checkIn = Carbon::createFromFormat('H:i:s', $record->check_in);
            $checkOut = Carbon::createFromFormat('H:i:s', $record->check_out);
            if ($checkOut->greaterThan($checkIn)) {
                $worked = $checkOut->diffInMinutes($checkIn);
                $overtimeMinutes = max(0, $worked - 480);
            }
        }

        $user = $record->relationLoaded('user') ? $record->user : $record->user()->first();

        return [
            'id' => $record->id,
            'user_id' => (int) $record->user_id,
            'user_name' => $user?->name,
            'user_email' => $user?->email,
            'user_avatar_url' => $user?->avatar ? asset($user->avatar) : null,
            'attendance_date' => optional($record->attendance_date)->format('Y-m-d'),
            'status' => strtolower((string) $record->status),
            'check_in' => $record->check_in ? Carbon::createFromFormat('H:i:s', $record->check_in)->format('H:i') : null,
            'check_out' => $record->check_out ? Carbon::createFromFormat('H:i:s', $record->check_out)->format('H:i') : null,
            'overtime_minutes' => $overtimeMinutes,
            'overtime_label' => $overtimeMinutes > 0 ? sprintf('%02d:%02d', intdiv($overtimeMinutes, 60), $overtimeMinutes % 60) : null,
            'notes' => $record->remarks,
            'created_at' => optional($record->created_at)->format('Y-m-d H:i:s'),
        ];
    }
}
