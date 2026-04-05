<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\LeaveManagementService;
use App\Models\User;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use RespondsWithMessages;

    public function index(Request $request, LeaveManagementService $leaveManagementService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return $this->successResponse([
            'notifications' => $leaveManagementService->formattedNotificationsForUser($user, 20),
            'unread_notifications_count' => $user->unreadNotifications()->count(),
        ], 'Notifications loaded.');
    }

    public function markRead(Request $request, string $notificationId, LeaveManagementService $leaveManagementService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $notification = $user->notifications()->find($notificationId);
        if (! $notification) {
            return $this->errorResponse('Notification not found.', 404);
        }

        if (! $notification->read_at) {
            $notification->markAsRead();
        }

        return $this->successResponse([
            'notification' => $leaveManagementService->presentNotification($notification->fresh()),
            'unread_notifications_count' => $user->fresh()->unreadNotifications()->count(),
        ], 'Notification marked as read.');
    }

    public function markAllRead(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user->unreadNotifications->markAsRead();

        return $this->successResponse([
            'unread_notifications_count' => 0,
        ], 'All notifications marked as read.');
    }
}
