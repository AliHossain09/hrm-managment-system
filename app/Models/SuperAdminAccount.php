<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SuperAdminAccount extends Model
{
    protected $fillable = [
        'owner_user_id',
        'super_admin_user_id',
        'phone',
        'address',
        'status',
        'subscription_starts_at',
        'subscription_ends_at',
        'billing_cycle_days',
        'notes',
    ];

    protected $casts = [
        'subscription_starts_at' => 'datetime',
        'subscription_ends_at' => 'datetime',
        'billing_cycle_days' => 'integer',
    ];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }

    public function superAdminUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'super_admin_user_id');
    }

    public function workspaces(): HasMany
    {
        return $this->hasMany(Workspace::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubscriptionPayment::class);
    }
}
