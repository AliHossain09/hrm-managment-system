<?php

namespace App\Http\Middleware;

use App\Services\AuthService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRoleGroup
{
    public function handle(Request $request, Closure $next, string $group): Response
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        $currentGroup = app(AuthService::class)->roleGroupFor($user);

        if ($currentGroup !== $group) {
            abort(403, 'You are not allowed to access this area.');
        }

        return $next($request);
    }
}
