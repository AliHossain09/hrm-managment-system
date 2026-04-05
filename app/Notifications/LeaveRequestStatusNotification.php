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
        $reviewNote = trim((string) ($this->leaveRequest->review_note ?? ''));
        $message = "Your {$leaveName} request for {$this->leaveRequest->requested_days} day(s) is {$status}.";

        if ($reviewNote !== '') {
            $message .= " Reason: {$reviewNote}";
        }

        return [
            'title' => "Leave request {$label}",
            'message' => $message,
            'status' => $status,
            'leave_request_id' => $this->leaveRequest->id,
            'leave_name' => $leaveName,
            'review_note' => $reviewNote,
        ];
    }
}
