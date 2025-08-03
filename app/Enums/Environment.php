<?php

namespace App\Enums;

enum Environment: string
{
    case Production = 'production';
    case Staging = 'staging';
    case Development = 'development';
    case Local = 'local';
}
