<?php

namespace App;

use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\User;
use App\Notifications\LeaveRequestStatusNotification;
use App\Notifications\LeaveRequestSubmittedNotification;
use Illuminate\Support\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeaveManagementService
{
    public function currentYear(): int
    {
        return (int) now()->year;
    }

    public function ensureLeaveBalancesForUser(User $user, ?int $year = null): Collection
    {
        $year ??= $this->currentYear();

        if (! $user->current_workspace_id) {
            return new Collection();
        }

        $leaveTypes = LeaveType::query()
            ->where('workspace_id', $user->current_workspace_id)
            ->orderBy('leave_name')
            ->get();

        foreach ($leaveTypes as $leaveType) {
            $balance = LeaveBalance::query()->firstOrNew([
                'workspace_id' => $user->current_workspace_id,
                'user_id' => $user->id,
                'leave_type_id' => $leaveType->id,
                'year' => $year,
            ]);

            $usedDays = (int) ($balance->used_days ?? 0);

            $balance->fill([
                'total_days' => (int) $leaveType->leave_days,
                'used_days' => $usedDays,
                'remaining_days' => max((int) $leaveType->leave_days - $usedDays, 0),
            ]);

            $balance->save();
        }

        return LeaveBalance::query()
            ->with('leaveType')
            ->where('workspace_id', $user->current_workspace_id)
            ->where('user_id', $user->id)
            ->where('year', $year)
            ->orderBy('leave_type_id')
            ->get();
    }

    public function syncWorkspaceLeaveBalances(int $workspaceId, ?int $year = null): void
    {
        $year ??= $this->currentYear();

        User::query()
            ->where('current_workspace_id', $workspaceId)
            ->get()
            ->filter(fn (User $user): bool => $user->isEmployee())
            ->each(fn (User $user) => $this->ensureLeaveBalancesForUser($user, $year));
    }

    public function resetYearlyBalances(?int $year = null): void
    {
        $year ??= $this->currentYear();

        $workspaceIds = LeaveType::query()
            ->distinct()
            ->pluck('workspace_id')
            ->filter()
            ->values();

        foreach ($workspaceIds as $workspaceId) {
            $leaveTypes = LeaveType::query()
                ->where('workspace_id', $workspaceId)
                ->get();

            $employees = User::query()
                ->where('current_workspace_id', $workspaceId)
                ->get()
                ->filter(fn (User $user): bool => $user->isEmployee());

            foreach ($employees as $employee) {
                foreach ($leaveTypes as $leaveType) {
                    LeaveBalance::query()->updateOrCreate(
                        [
                            'workspace_id' => $workspaceId,
                            'user_id' => $employee->id,
                            'leave_type_id' => $leaveType->id,
                            'year' => $year,
                        ],
                        [
                            'total_days' => (int) $leaveType->leave_days,
                            'used_days' => 0,
                            'remaining_days' => (int) $leaveType->leave_days,
                        ]
                    );
                }
            }
        }
    }

    public function employeePortalPayload(User $user): array
    {
        $year = $this->currentYear();
        $balances = $this->ensureLeaveBalancesForUser($user, $year);

        $pendingDays = LeaveRequest::query()
            ->selectRaw('leave_type_id, SUM(requested_days) as total_days')
            ->where('workspace_id', $user->current_workspace_id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->whereYear('from_date', $year)
            ->groupBy('leave_type_id')
            ->pluck('total_days', 'leave_type_id');

        $leaveTypes = $balances->map(function (LeaveBalance $balance) use ($pendingDays): array {
            $pending = (int) ($pendingDays[$balance->leave_type_id] ?? 0);

            return [
                'leave_type_id' => $balance->leave_type_id,
                'leave_name' => $balance->leaveType?->leave_name ?? 'Leave',
                'total_days' => (int) $balance->total_days,
                'used_days' => (int) $balance->used_days,
                'remaining_days' => (int) $balance->remaining_days,
                'pending_days' => $pending,
                'available_to_request' => max((int) $balance->remaining_days - $pending, 0),
                'year' => (int) $balance->year,
            ];
        })->values()->all();

        return [
            'leave_types' => $leaveTypes,
            'leave_requests' => $this->formattedLeaveRequestsForUser($user),
            'notifications' => $this->formattedNotificationsForUser($user, 12),
            'unread_notifications_count' => $user->unreadNotifications()->count(),
            'year' => $year,
        ];
    }

    public function masterAdminPortalPayload(User $user): array
    {
        $workspaceId = (int) $user->current_workspace_id;

        $pendingRequests = LeaveRequest::query()
            ->with(['user:id,name,email', 'leaveType:id,leave_name'])
            ->where('workspace_id', $workspaceId)
            ->where('status', 'pending')
            ->latest('id')
            ->get();

        $recentRequests = LeaveRequest::query()
            ->with(['user:id,name,email', 'leaveType:id,leave_name', 'approver:id,name'])
            ->where('workspace_id', $workspaceId)
            ->latest('id')
            ->limit(20)
            ->get();

        return [
            'pending_count' => $pendingRequests->count(),
            'pending_requests' => $pendingRequests->map(fn (LeaveRequest $request): array => $this->presentLeaveRequest($request))->values()->all(),
            'recent_requests' => $recentRequests->map(fn (LeaveRequest $request): array => $this->presentLeaveRequest($request))->values()->all(),
            'notifications' => $this->formattedNotificationsForUser($user, 12),
            'unread_notifications_count' => $user->unreadNotifications()->count(),
        ];
    }

    public function submitLeaveRequest(User $user, LeaveType $leaveType, array $payload): LeaveRequest
    {
        $workspaceId = (int) $user->current_workspace_id;
        $year = $this->currentYear();
        $fromDate = date('Y-m-d', strtotime((string) $payload['from_date']));
        $toDate = date('Y-m-d', strtotime((string) $payload['to_date']));

        if ((int) date('Y', strtotime($fromDate)) !== $year || (int) date('Y', strtotime($toDate)) !== $year) {
            throw ValidationException::withMessages([
                'from_date' => ['Leave request must stay within the current year.'],
            ]);
        }

        if ($workspaceId !== (int) $leaveType->workspace_id) {
            throw ValidationException::withMessages([
                'leave_type_id' => ['This leave type is not available for your workspace.'],
            ]);
        }

        $requestedDays = $this->countDays($fromDate, $toDate);
        $this->ensureNoDateOverlap($user, $fromDate, $toDate);

        $balance = $this->ensureLeaveBalancesForUser($user, $year)
            ->firstWhere('leave_type_id', $leaveType->id);

        if (! $balance) {
            throw ValidationException::withMessages([
                'leave_type_id' => ['No leave balance found for this leave type.'],
            ]);
        }

        $availableToRequest = $this->availableDaysToRequest($user, $leaveType->id, $year);
        if ($requestedDays > $availableToRequest) {
            throw ValidationException::withMessages([
                'to_date' => ["You only have {$availableToRequest} day(s) available to request for {$leaveType->leave_name}."],
            ]);
        }

        $leaveRequest = DB::transaction(function () use ($user, $leaveType, $workspaceId, $fromDate, $toDate, $requestedDays, $payload) {
            return LeaveRequest::query()->create([
                'workspace_id' => $workspaceId,
                'user_id' => $user->id,
                'leave_type_id' => $leaveType->id,
                'from_date' => $fromDate,
                'to_date' => $toDate,
                'requested_days' => $requestedDays,
                'status' => 'pending',
                'reason' => $payload['reason'] ?? null,
            ]);
        });

        $this->masterAdminsForWorkspace($workspaceId)->each(function (User $admin) use ($leaveRequest, $user, $leaveType): void {
            $admin->notify(new LeaveRequestSubmittedNotification($leaveRequest, $user, $leaveType));
        });

        return $leaveRequest->fresh(['leaveType', 'user', 'approver']);
    }

    public function reviewLeaveRequest(User $admin, LeaveRequest $leaveRequest, string $status): LeaveRequest
    {
        if ($leaveRequest->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending leave requests can be updated.'],
            ]);
        }

        $leaveRequest->loadMissing(['user', 'leaveType', 'approver']);
        $employee = $leaveRequest->user;

        if (! $employee) {
            throw ValidationException::withMessages([
                'leave_request' => ['Employee record not found for this leave request.'],
            ]);
        }

        DB::transaction(function () use ($admin, $leaveRequest, $employee, $status): void {
            if ($status === 'approved') {
                $year = (int) $leaveRequest->from_date->format('Y');
                $balance = $this->ensureLeaveBalancesForUser($employee, $year)
                    ->firstWhere('leave_type_id', $leaveRequest->leave_type_id);

                if (! $balance) {
                    throw ValidationException::withMessages([
                        'leave_request' => ['No leave balance found for this employee and leave type.'],
                    ]);
                }

                $otherPendingDays = LeaveRequest::query()
                    ->where('workspace_id', $leaveRequest->workspace_id)
                    ->where('user_id', $leaveRequest->user_id)
                    ->where('leave_type_id', $leaveRequest->leave_type_id)
                    ->where('status', 'pending')
                    ->whereYear('from_date', $year)
                    ->where('id', '!=', $leaveRequest->id)
                    ->sum('requested_days');

                $available = max((int) $balance->remaining_days - (int) $otherPendingDays, 0);
                if ((int) $leaveRequest->requested_days > $available) {
                    throw ValidationException::withMessages([
                        'status' => ['This request cannot be approved because the remaining leave balance is no longer enough.'],
                    ]);
                }

                $usedDays = (int) $balance->used_days + (int) $leaveRequest->requested_days;
                $balance->update([
                    'used_days' => $usedDays,
                    'remaining_days' => max((int) $balance->total_days - $usedDays, 0),
                ]);
            }

            $leaveRequest->update([
                'status' => $status,
                'approved_by' => $admin->id,
                'approved_at' => now(),
            ]);
        });

        $leaveRequest = $leaveRequest->fresh(['leaveType', 'user', 'approver']);

        $employee->notify(new LeaveRequestStatusNotification($leaveRequest));

        return $leaveRequest;
    }

    public function presentLeaveRequest(LeaveRequest $request): array
    {
        return [
            'id' => $request->id,
            'employee_name' => $request->user?->name,
            'employee_email' => $request->user?->email,
            'leave_type_id' => $request->leave_type_id,
            'leave_name' => $request->leaveType?->leave_name,
            'from_date' => optional($request->from_date)->format('Y-m-d'),
            'to_date' => optional($request->to_date)->format('Y-m-d'),
            'requested_days' => (int) $request->requested_days,
            'status' => (string) $request->status,
            'reason' => $request->reason,
            'approved_by_name' => $request->approver?->name,
            'approved_at' => optional($request->approved_at)->format('Y-m-d H:i:s'),
            'created_at' => optional($request->created_at)->format('Y-m-d H:i:s'),
        ];
    }

    public function formattedLeaveRequestsForUser(User $user): array
    {
        return LeaveRequest::query()
            ->with(['leaveType:id,leave_name', 'approver:id,name'])
            ->where('workspace_id', $user->current_workspace_id)
            ->where('user_id', $user->id)
            ->latest('id')
            ->get()
            ->map(fn (LeaveRequest $request): array => $this->presentLeaveRequest($request))
            ->values()
            ->all();
    }

    public function formattedNotificationsForUser(User $user, int $limit = 10): array
    {
        return $user->notifications()
            ->latest('created_at')
            ->limit($limit)
            ->get()
            ->map(fn (DatabaseNotification $notification): array => $this->presentNotification($notification))
            ->values()
            ->all();
    }

    public function presentNotification(DatabaseNotification $notification): array
    {
        $data = (array) $notification->data;

        return [
            'id' => $notification->id,
            'type' => class_basename($notification->type),
            'title' => $data['title'] ?? 'Notification',
            'message' => $data['message'] ?? '',
            'status' => $data['status'] ?? null,
            'leave_request_id' => $data['leave_request_id'] ?? null,
            'created_at' => optional($notification->created_at)->format('Y-m-d H:i:s'),
            'read_at' => optional($notification->read_at)->format('Y-m-d H:i:s'),
            'is_read' => $notification->read_at !== null,
        ];
    }

    private function masterAdminsForWorkspace(int $workspaceId): Collection
    {
        return User::query()
            ->where('current_workspace_id', $workspaceId)
            ->where(function ($query): void {
                $query
                    ->whereIn('account_level', ['master_admin', 'master admin'])
                    ->orWhere('type', 'master admin')
                    ->orWhereHas('roles', function ($roleQuery): void {
                        $roleQuery->where('name', 'master admin');
                    });
            })
            ->get();
    }

    private function availableDaysToRequest(User $user, int $leaveTypeId, int $year): int
    {
        $balance = $this->ensureLeaveBalancesForUser($user, $year)
            ->firstWhere('leave_type_id', $leaveTypeId);

        if (! $balance) {
            return 0;
        }

        $pendingDays = LeaveRequest::query()
            ->where('workspace_id', $user->current_workspace_id)
            ->where('user_id', $user->id)
            ->where('leave_type_id', $leaveTypeId)
            ->where('status', 'pending')
            ->whereYear('from_date', $year)
            ->sum('requested_days');

        return max((int) $balance->remaining_days - (int) $pendingDays, 0);
    }

    private function ensureNoDateOverlap(User $user, string $fromDate, string $toDate): void
    {
        $hasOverlap = LeaveRequest::query()
            ->where('workspace_id', $user->current_workspace_id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->whereDate('from_date', '<=', $toDate)
            ->whereDate('to_date', '>=', $fromDate)
            ->exists();

        if ($hasOverlap) {
            throw ValidationException::withMessages([
                'from_date' => ['You already have a pending or approved leave request covering these dates.'],
            ]);
        }
    }

    private function countDays(string $fromDate, string $toDate): int
    {
        return (int) Carbon::parse($fromDate)->diffInDays(Carbon::parse($toDate)) + 1;
    }
}
