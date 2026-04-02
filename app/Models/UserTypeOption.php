<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserTypeOption extends Model
{
    protected $fillable = [
        'workspace_id',
        'name',
        'is_part_time',
    ];

    protected $casts = [
        'is_part_time' => 'boolean',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }
}
