<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Services\AuthService;
use App\Traits\RespondsWithMessages;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    use RespondsWithMessages;

    public function login(LoginRequest $request, AuthService $authService): JsonResponse
    {
        $result = $authService->loginForApi($request->validated());

        if (! $result['ok']) {
            return $this->errorResponse($result['message'], 401);
        }

        return $this->successResponse([
            'token' => $result['token'],
            'token_type' => $result['token_type'],
            'role_group' => $result['role_group'],
            'dashboard_route' => $result['dashboard_route'],
            'workspace' => $result['workspace'],
            'user' => [
                'id' => $result['user']->id,
                'name' => $result['user']->name,
                'email' => $result['user']->email,
                'type' => $result['user']->type,
                'account_level' => $result['user']->account_level,
                'permissions' => $authService->permissionNamesFor($result['user']),
            ],
        ], $result['message']);
    }

    public function me(Request $request, AuthService $authService): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        return $this->successResponse([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'type' => $user->type,
            'account_level' => $user->account_level,
            'role_group' => $authService->roleGroupFor($user),
            'workspace' => $authService->workspacePayload($user),
            'permissions' => $authService->permissionNamesFor($user),
        ], 'Current user profile.');
    }

    public function logout(Request $request, AuthService $authService): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $authService->logoutApi($user);

        return $this->successResponse(null, 'Logged out successfully.');
    }
}
