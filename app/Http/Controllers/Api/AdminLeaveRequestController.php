<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\LeaveManagementService;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\AuthService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminLeaveRequestController extends Controller
{
    use RespondsWithMessages;

    public function index(Request $request, AuthService $authService, LeaveManagementService $leaveManagementService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $authService->isMasterAdmin($user)) {
            return $this->errorResponse('Only master admin can review leave requests.', 403);
        }

        if (! $user->current_workspace_id) {
            return $this->errorResponse('No workspace assigned to this account.', 422);
        }

        return $this->successResponse(
            $leaveManagementService->masterAdminPortalPayload($user),
            'Leave approvals loaded.'
        );
    }

    public function update(Request $request, LeaveRequest $leaveRequest, AuthService $authService, LeaveManagementService $leaveManagementService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $authService->isMasterAdmin($user)) {
            return $this->errorResponse('Only master admin can update leave requests.', 403);
        }

        if (! $user->current_workspace_id || (int) $leaveRequest->workspace_id !== (int) $user->current_workspace_id) {
            return $this->errorResponse('You cannot update leave requests from another workspace.', 403);
        }

        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(['approved', 'rejected'])],
        ]);

        $updated = $leaveManagementService->reviewLeaveRequest($user, $leaveRequest, $validated['status']);

        return $this->successResponse([
            'request' => $leaveManagementService->presentLeaveRequest($updated),
            'portal' => $leaveManagementService->masterAdminPortalPayload($user),
        ], 'Leave request updated successfully.');
    }
}
