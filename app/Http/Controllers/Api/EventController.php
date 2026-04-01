<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreEventRequest;
use App\Http\Requests\Api\UpdateEventRequest;
use App\Models\Event;
use App\Services\AuthService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EventController extends Controller
{
    use RespondsWithMessages;

    public function index(Request $request, AuthService $authService): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $canCreate = $authService->hasPermission($user, 'event.create');
        $canUpdate = $authService->hasPermission($user, 'event.update');
        $canDelete = $authService->hasPermission($user, 'event.delete');

        $events = Event::query()
            ->orderBy('start_date')
            ->orderBy('id')
            ->get()
            ->map(static fn (Event $event): array => [
                'id' => $event->id,
                'title' => $event->title,
                'start_date' => optional($event->start_date)->format('Y-m-d'),
                'end_date' => optional($event->end_date)->format('Y-m-d'),
                'notes' => $event->notes,
            ])
            ->values()
            ->all();

        return $this->successResponse([
            'events' => $events,
            'permissions' => [
                'can_create' => $canCreate,
                'can_update' => $canUpdate,
                'can_delete' => $canDelete,
            ],
        ], 'Events loaded successfully.');
    }

    public function store(StoreEventRequest $request, AuthService $authService): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if (! $authService->hasPermission($user, 'event.create')) {
            return $this->errorResponse('You do not have permission to create event.', 403);
        }

        $event = Event::query()->create([
            ...$request->validated(),
            'created_by' => $user->id,
            'updated_by' => $user->id,
        ]);

        return $this->successResponse([
            'id' => $event->id,
            'title' => $event->title,
            'start_date' => optional($event->start_date)->format('Y-m-d'),
            'end_date' => optional($event->end_date)->format('Y-m-d'),
            'notes' => $event->notes,
        ], 'Event created successfully.', 201);
    }

    public function update(UpdateEventRequest $request, Event $event, AuthService $authService): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if (! $authService->hasPermission($user, 'event.update')) {
            return $this->errorResponse('You do not have permission to edit event.', 403);
        }

        $event->update([
            ...$request->validated(),
            'updated_by' => $user->id,
        ]);

        return $this->successResponse([
            'id' => $event->id,
            'title' => $event->title,
            'start_date' => optional($event->start_date)->format('Y-m-d'),
            'end_date' => optional($event->end_date)->format('Y-m-d'),
            'notes' => $event->notes,
        ], 'Event updated successfully.');
    }

    public function destroy(Request $request, Event $event, AuthService $authService): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if (! $authService->hasPermission($user, 'event.delete')) {
            return $this->errorResponse('You do not have permission to delete event.', 403);
        }

        $event->delete();

        return $this->successResponse(null, 'Event deleted successfully.');
    }
}
