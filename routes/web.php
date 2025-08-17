<?php

use App\Http\Controllers\VideoRoomController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    // ビデオルーム一覧表示
    Route::get('video-rooms', [VideoRoomController::class, 'index']);
    // ビデオルーム一覧取得
    Route::get('api/video-rooms', [VideoRoomController::class, 'fetchList']);
    // ビデオルーム作成処理
    Route::post('api/video-rooms', [VideoRoomController::class, 'store']);
    // ビデオルーム集室前確認
    Route::get('/video-rooms/{videoRoom}/preview', [VideoRoomController::class, 'preview']);
    // ビデオルーム詳細表示（参加画面）
    Route::get('/video-rooms/{videoRoom}', [VideoRoomController::class, 'show']);
    // 背景ぼかし強度の保存
    Route::post('api/video-rooms/store-blur-strength', [VideoRoomController::class, 'storeBlurStrength']);
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
