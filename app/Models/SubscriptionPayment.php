<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubscriptionPayment extends Model
{
    protected $fillable = [
        'super_admin_account_id',
        'payment_method',
        'amount',
        'currency',
        'status',
        'paid_at',
        'reference',
        'meta',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function superAdminAccount(): BelongsTo
    {
        return $this->belongsTo(SuperAdminAccount::class);
    }
}
