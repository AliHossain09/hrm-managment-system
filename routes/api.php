<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminLeaveRequestController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmployeeLeaveController;
use App\Http\Controllers\Api\EventController;
use App\Http\Controllers\Api\HrmCatalogController;
use App\Http\Controllers\Api\LeaveTypeController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OwnerSaasController;
use App\Http\Controllers\Api\StaffController;
use App\Http\Controllers\Api\SuperAdminSaasController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function (): void {
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth.apitoken')->group(function (): void {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
        Route::post('/notifications/{notificationId}/read', [NotificationController::class, 'markRead']);

        Route::get('/events', [EventController::class, 'index']);
        Route::post('/events', [EventController::class, 'store']);
        Route::put('/events/{event}', [EventController::class, 'update']);
        Route::delete('/events/{event}', [EventController::class, 'destroy']);

        Route::get('/owner/super-admins', [OwnerSaasController::class, 'index']);
        Route::post('/owner/super-admins', [OwnerSaasController::class, 'store']);
        Route::put('/owner/super-admins/{superAdminAccount}', [OwnerSaasController::class, 'update']);
        Route::delete('/owner/super-admins/{superAdminAccount}', [OwnerSaasController::class, 'destroy']);

        Route::get('/super-admin/workspaces', [SuperAdminSaasController::class, 'indexWorkspaces']);
        Route::post('/super-admin/workspaces', [SuperAdminSaasController::class, 'storeWorkspace']);
        Route::put('/super-admin/workspaces/{workspace}', [SuperAdminSaasController::class, 'updateWorkspace']);
        Route::delete('/super-admin/workspaces/{workspace}', [SuperAdminSaasController::class, 'destroyWorkspace']);

        Route::middleware('role.group:admin')->group(function (): void {
            Route::get('/staff/users', [StaffController::class, 'users']);
            Route::post('/staff/users', [StaffController::class, 'storeUser']);
            Route::put('/staff/users/{user}', [StaffController::class, 'updateUser']);
            Route::delete('/staff/users/{user}', [StaffController::class, 'deleteUser']);
            Route::get('/staff/employees', [StaffController::class, 'employees']);
            Route::put('/staff/employees/{user}', [StaffController::class, 'updateEmployee']);
            Route::get('/staff/attendance', [StaffController::class, 'attendanceIndex']);
            Route::post('/staff/attendance', [StaffController::class, 'attendanceStore']);
            Route::put('/staff/attendance/{attendanceRecord}', [StaffController::class, 'attendanceUpdate']);
            Route::delete('/staff/attendance/{attendanceRecord}', [StaffController::class, 'attendanceDelete']);
            Route::get('/staff/roles', [StaffController::class, 'roles']);
            Route::put('/staff/roles/{role}', [StaffController::class, 'updateRolePermissions']);

            Route::get('/hrm/user-roles', [HrmCatalogController::class, 'indexUserRoles']);
            Route::post('/hrm/user-roles', [HrmCatalogController::class, 'storeUserRole']);
            Route::put('/hrm/user-roles/{role}', [HrmCatalogController::class, 'updateUserRole']);
            Route::delete('/hrm/user-roles/{role}', [HrmCatalogController::class, 'destroyUserRole']);

            Route::get('/hrm/departments', [HrmCatalogController::class, 'indexDepartments']);
            Route::post('/hrm/departments', [HrmCatalogController::class, 'storeDepartment']);
            Route::put('/hrm/departments/{department}', [HrmCatalogController::class, 'updateDepartment']);
            Route::delete('/hrm/departments/{department}', [HrmCatalogController::class, 'destroyDepartment']);

            Route::get('/hrm/designations', [HrmCatalogController::class, 'indexDesignations']);
            Route::post('/hrm/designations', [HrmCatalogController::class, 'storeDesignation']);
            Route::put('/hrm/designations/{designation}', [HrmCatalogController::class, 'updateDesignation']);
            Route::delete('/hrm/designations/{designation}', [HrmCatalogController::class, 'destroyDesignation']);

            Route::get('/hrm/user-types', [HrmCatalogController::class, 'indexUserTypes']);
            Route::post('/hrm/user-types', [HrmCatalogController::class, 'storeUserType']);
            Route::put('/hrm/user-types/{userTypeOption}', [HrmCatalogController::class, 'updateUserType']);
            Route::delete('/hrm/user-types/{userTypeOption}', [HrmCatalogController::class, 'destroyUserType']);

            Route::get('/hrm/part-time-hours', [HrmCatalogController::class, 'indexPartTimeHours']);
            Route::post('/hrm/part-time-hours', [HrmCatalogController::class, 'storePartTimeHour']);
            Route::put('/hrm/part-time-hours/{partTimeHourOption}', [HrmCatalogController::class, 'updatePartTimeHour']);
            Route::delete('/hrm/part-time-hours/{partTimeHourOption}', [HrmCatalogController::class, 'destroyPartTimeHour']);

            Route::get('/leaves', [LeaveTypeController::class, 'index']);
            Route::post('/leaves', [LeaveTypeController::class, 'store']);
            Route::put('/leaves/{leaveType}', [LeaveTypeController::class, 'update']);
            Route::delete('/leaves/{leaveType}', [LeaveTypeController::class, 'destroy']);
            Route::get('/admin/leave-requests', [AdminLeaveRequestController::class, 'index']);
            Route::put('/admin/leave-requests/{leaveRequest}', [AdminLeaveRequestController::class, 'update']);
        });

        Route::middleware('role.group:employee')->group(function (): void {
            Route::get('/employee/leaves', [EmployeeLeaveController::class, 'index']);
            Route::post('/employee/leaves', [EmployeeLeaveController::class, 'store']);
        });
    });
});




