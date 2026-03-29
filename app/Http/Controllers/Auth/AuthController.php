<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\AuthService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class AuthController extends Controller
{
    use RespondsWithMessages;

    public function showLogin(): View
    {
        return view('login');
    }

    public function login(LoginRequest $request, AuthService $authService): RedirectResponse
    {
        $result = $authService->loginForWeb($request->validated(), $request->boolean('remember'));

        if (! $result['ok']) {
            $this->flashError($result['message']);

            return back()->withInput($request->safe()->except('password'));
        }

        $request->session()->regenerate();
        $this->flashSuccess($result['message']);

        return redirect()->route($result['route']);
    }

    public function logout(Request $request, AuthService $authService): RedirectResponse
    {
        $authService->logoutWeb();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $this->flashSuccess('Logged out successfully.');

        return redirect()->route('login');
    }
}
