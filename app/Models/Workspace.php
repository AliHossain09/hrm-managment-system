<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Workspace extends Model
{
    protected $fillable = [
        'super_admin_account_id',
        'name',
        'slug',
        'logo',
        'status',
        'subscription_starts_at',
        'subscription_ends_at',
    ];

    protected $casts = [
        'subscription_starts_at' => 'datetime',
        'subscription_ends_at' => 'datetime',
    ];

    public function superAdminAccount(): BelongsTo
    {
        return $this->belongsTo(SuperAdminAccount::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'workspace_user_roles')
            ->withPivot('role')
            ->withTimestamps();
    }

    public function workspaceUserRoles(): HasMany
    {
        return $this->hasMany(WorkspaceUserRole::class);
    }
}
