<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\LeaveManagementService;
use App\Models\LeaveType;
use App\Models\User;
use App\Services\AuthService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmployeeLeaveController extends Controller
{
    use RespondsWithMessages;

    public function index(Request $request, AuthService $authService, LeaveManagementService $leaveManagementService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($authService->roleGroupFor($user) !== 'employee') {
            return $this->errorResponse('Only employees can access leave requests.', 403);
        }

        return $this->successResponse(
            $leaveManagementService->employeePortalPayload($user),
            'Employee leave portal loaded.'
        );
    }

    public function store(Request $request, AuthService $authService, LeaveManagementService $leaveManagementService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($authService->roleGroupFor($user) !== 'employee') {
            return $this->errorResponse('Only employees can apply for leave.', 403);
        }

        if (! $user->current_workspace_id) {
            return $this->errorResponse('No workspace assigned to this account.', 422);
        }

        $validated = $request->validate([
            'leave_type_id' => ['required', 'integer', 'exists:leave_types,id'],
            'from_date' => ['required', 'date', 'after_or_equal:today'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $leaveType = LeaveType::query()->findOrFail((int) $validated['leave_type_id']);
        $leaveRequest = $leaveManagementService->submitLeaveRequest($user, $leaveType, $validated);

        return $this->successResponse([
            'request' => $leaveManagementService->presentLeaveRequest($leaveRequest),
            'portal' => $leaveManagementService->employeePortalPayload($user),
        ], 'Leave request submitted successfully.', 201);
    }
}
