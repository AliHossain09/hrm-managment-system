<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use RespondsWithMessages;

    public function index(Request $request, AuthService $authService): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $roleGroup = $authService->roleGroupFor($user);

        $cards = $roleGroup === 'employee'
            ? [
                ['title' => 'Attendance Status', 'value' => 'Regular'],
                ['title' => 'Available Casual Leave', 'value' => '9'],
                ['title' => 'Available Sick Leave', 'value' => '14'],
            ]
            : [
                ['title' => 'Total Employees', 'value' => '128'],
                ['title' => 'Pending Notices', 'value' => '04'],
                ['title' => 'Attendance Alerts', 'value' => '07'],
            ];

        return $this->successResponse([
            'role_group' => $roleGroup,
            'cards' => $cards,
        ], 'Dashboard payload loaded.');
    }
}
