<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveType;
use App\Models\User;
use App\Services\AuthService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeaveTypeController extends Controller
{
    use RespondsWithMessages;

    public function index(Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $authService->isMasterAdmin($user)) {
            return $this->errorResponse('Only master admin can manage leave types.', 403);
        }

        if (! $user->current_workspace_id) {
            return $this->errorResponse('No workspace assigned to this account.', 422);
        }

        $leaveTypes = LeaveType::query()
            ->where('workspace_id', $user->current_workspace_id)
            ->orderBy('id')
            ->get()
            ->map(fn (LeaveType $leaveType): array => [
                'id' => $leaveType->id,
                'leave_name' => $leaveType->leave_name,
                'leave_days' => $leaveType->leave_days,
                'created_at' => optional($leaveType->created_at)->format('Y-m-d H:i:s'),
            ])
            ->values();

        return $this->successResponse([
            'leave_types' => $leaveTypes,
        ], 'Leave types loaded.');
    }

    public function store(Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $authService->isMasterAdmin($user)) {
            return $this->errorResponse('Only master admin can create leave types.', 403);
        }

        if (! $user->current_workspace_id) {
            return $this->errorResponse('No workspace assigned to this account.', 422);
        }

        $validated = $request->validate([
            'leave_name' => [
                'required',
                'string',
                'max:120',
                Rule::unique('leave_types', 'leave_name')->where(function ($query) use ($user): void {
                    $query->where('workspace_id', $user->current_workspace_id);
                }),
            ],
            'leave_days' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        $leaveType = LeaveType::query()->create([
            'workspace_id' => $user->current_workspace_id,
            'leave_name' => $validated['leave_name'],
            'leave_days' => $validated['leave_days'],
        ]);

        return $this->successResponse([
            'id' => $leaveType->id,
            'leave_name' => $leaveType->leave_name,
            'leave_days' => $leaveType->leave_days,
            'created_at' => optional($leaveType->created_at)->format('Y-m-d H:i:s'),
        ], 'Leave type created successfully.', 201);
    }

    public function update(Request $request, LeaveType $leaveType, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $authService->isMasterAdmin($user)) {
            return $this->errorResponse('Only master admin can update leave types.', 403);
        }

        if (! $user->current_workspace_id || (int) $leaveType->workspace_id !== (int) $user->current_workspace_id) {
            return $this->errorResponse('You cannot update leave type from another workspace.', 403);
        }

        $validated = $request->validate([
            'leave_name' => [
                'required',
                'string',
                'max:120',
                Rule::unique('leave_types', 'leave_name')
                    ->ignore($leaveType->id)
                    ->where(function ($query) use ($user): void {
                        $query->where('workspace_id', $user->current_workspace_id);
                    }),
            ],
            'leave_days' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        $leaveType->update([
            'leave_name' => $validated['leave_name'],
            'leave_days' => $validated['leave_days'],
        ]);

        return $this->successResponse([
            'id' => $leaveType->id,
            'leave_name' => $leaveType->leave_name,
            'leave_days' => $leaveType->leave_days,
            'created_at' => optional($leaveType->created_at)->format('Y-m-d H:i:s'),
        ], 'Leave type updated successfully.');
    }

    public function destroy(Request $request, LeaveType $leaveType, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $authService->isMasterAdmin($user)) {
            return $this->errorResponse('Only master admin can delete leave types.', 403);
        }

        if (! $user->current_workspace_id || (int) $leaveType->workspace_id !== (int) $user->current_workspace_id) {
            return $this->errorResponse('You cannot delete leave type from another workspace.', 403);
        }

        $leaveType->delete();

        return $this->successResponse(null, 'Leave type deleted successfully.');
    }
}

