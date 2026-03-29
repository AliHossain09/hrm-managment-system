<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\StaffController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth.apitoken')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/dashboard', [DashboardController::class, 'index']);

        Route::middleware('role.group:admin')->group(function (): void {
            Route::get('/staff/users', [StaffController::class, 'users']);
            Route::post('/staff/users', [StaffController::class, 'storeUser']);
            Route::put('/staff/users/{user}', [StaffController::class, 'updateUser']);
            Route::delete('/staff/users/{user}', [StaffController::class, 'deleteUser']);
            Route::get('/staff/roles', [StaffController::class, 'roles']);
            Route::put('/staff/roles/{role}', [StaffController::class, 'updateRolePermissions']);
        });
    });
});
