<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'password',
        'type',
        'account_level',
        'current_workspace_id',
        'api_token',
        'avatar',
        'is_active',
        'last_login_at',
        'user_type',
        'part_time_hours',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'api_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'model_has_roles', 'model_id', 'role_id')
            ->wherePivot('model_type', self::class);
    }

    public function workspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'workspace_user_roles')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function workspaceRoles(): HasMany
    {
        return $this->hasMany(WorkspaceUserRole::class);
    }

    public function currentWorkspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class, 'current_workspace_id');
    }

    public function ownedSuperAdminAccounts(): HasMany
    {
        return $this->hasMany(SuperAdminAccount::class, 'owner_user_id');
    }

    public function superAdminAccountProfile(): HasOne
    {
        return $this->hasOne(SuperAdminAccount::class, 'super_admin_user_id');
    }

    public function employeeProfile(): HasOne
    {
        return $this->hasOne(EmployeeProfile::class);
    }

    public function employeeCompensations(): HasMany
    {
        return $this->hasMany(EmployeeCompensation::class);
    }

    public function currentCompensation(): HasOne
    {
        return $this->hasOne(EmployeeCompensation::class, 'user_id')
            ->ofMany(['id' => 'max'], function ($query): void {
                $query->whereNull('effective_to');
            });
    }

    public function employeeBankAccount(): HasOne
    {
        return $this->hasOne(EmployeeBankAccount::class);
    }

    public function attendanceRecords(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class);
    }

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function approvedLeaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class, 'approved_by');
    }

    public function primaryRoleName(): ?string
    {
        return $this->roles()->value('name') ?: $this->type;
    }

    public function isEmployee(): bool
    {
        $role = Str::of((string) $this->primaryRoleName())->lower()->replace('_', ' ')->value();

        return str_contains($role, 'employee');
    }
}


