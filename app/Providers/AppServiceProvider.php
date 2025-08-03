<?php

namespace App\Providers;

use App\Enums\Environment;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (config('app.env') === Environment::Local->value) {
            // Force HTTPS when using ngrok tunnel
            $host = request()->headers->get('host');
            $isNgrok = str_contains($host, 'ngrok');
            if ($isNgrok) {
                URL::forceScheme('https');
            }
        }
    }
}
