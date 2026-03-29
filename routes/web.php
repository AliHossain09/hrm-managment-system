<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DashboardController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route('login'));

Route::middleware('guest')->group(function (): void {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->name('login.submit');
});

Route::middleware('auth')->group(function (): void {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/admin', [DashboardController::class, 'admin'])
        ->middleware('role.group:admin')
        ->name('dashboard.admin');
    Route::get('/dashboard/employee', [DashboardController::class, 'employee'])
        ->middleware('role.group:employee')
        ->name('dashboard.employee');

    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
});
