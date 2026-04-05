<?php

namespace App\Notifications;

use App\Models\LeaveRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LeaveRequestStatusNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly LeaveRequest $leaveRequest)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $status = (string) $this->leaveRequest->status;
        $label = ucfirst($status);
        $leaveName = $this->leaveRequest->leaveType?->leave_name ?? 'leave';

        return [
            'title' => "Leave request {$label}",
            'message' => "Your {$leaveName} request for {$this->leaveRequest->requested_days} day(s) is {$status}.",
            'status' => $status,
            'leave_request_id' => $this->leaveRequest->id,
            'leave_name' => $leaveName,
        ];
    }
}
