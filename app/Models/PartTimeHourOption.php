<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartTimeHourOption extends Model
{
    protected $fillable = [
        'workspace_id',
        'hours',
    ];

    protected $casts = [
        'hours' => 'integer',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
