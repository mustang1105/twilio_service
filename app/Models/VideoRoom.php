<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VideoRoom extends Model
{
    protected $fillable = [
        'name',
        'room_sid',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
