<?php

namespace App\Http\Controllers;

use App\Services\AuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function index(AuthService $authService): RedirectResponse
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        return redirect()->route($authService->dashboardRouteFor($user));
    }

    public function admin(AuthService $authService): View
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        return view('dashboard_admin', [
            'user' => $user,
            'roleGroup' => $authService->roleGroupFor($user),
        ]);
    }

    public function employee(AuthService $authService): View
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        return view('dashboard_employee', [
            'user' => $user,
            'roleGroup' => $authService->roleGroupFor($user),
        ]);
    }
}
