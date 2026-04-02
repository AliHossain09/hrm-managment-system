<?php

namespace App\Http\Middleware;

use App\Services\AuthService;
use App\Services\SubscriptionAccessService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ApiTokenAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        $user = app(AuthService::class)->userByApiToken($token);

        if (! $user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated. Invalid or missing API token.',
            ], 401);
        }

        if (! app(SubscriptionAccessService::class)->canLogin($user)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Account is inactive or subscription expired.',
            ], 403);
        }

        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
