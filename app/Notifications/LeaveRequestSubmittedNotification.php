<?php

namespace App\Notifications;

use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LeaveRequestSubmittedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly LeaveRequest $leaveRequest,
        private readonly User $employee,
        private readonly LeaveType $leaveType,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => 'New leave request pending',
            'message' => "{$this->employee->name} requested {$this->leaveRequest->requested_days} day(s) of {$this->leaveType->leave_name}.",
            'status' => 'pending',
            'leave_request_id' => $this->leaveRequest->id,
            'employee_name' => $this->employee->name,
            'leave_name' => $this->leaveType->leave_name,
        ];
    }
}
