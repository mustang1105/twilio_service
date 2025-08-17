<?php

namespace App\Http\Controllers;

use App\Models\VideoRoom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Twilio\Jwt\AccessToken;
use Twilio\Jwt\Grants\VideoGrant;
use Twilio\Rest\Client;

class VideoRoomController extends Controller
{
    private Client $twilio;

    public function __construct()
    {
        $this->twilio = new Client(
            config('services.twilio.account_sid'),
            config('services.twilio.auth_token')
        );
    }

    public function index(): Response
    {
        $rooms = VideoRoom::where('is_active', true)->get();

        return Inertia::render('video-rooms/index', [
            'rooms' => $rooms,
        ]);
    }

    public function fetchList(): JsonResponse
    {
        $rooms = VideoRoom::where('is_active', true)
            ->latest()
            ->get();

        return response()->json([
            'rooms' => $rooms,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        VideoRoom::create([
            'name' => $request->name,
            'is_active' => true,
        ]);

        return response()->json();
    }

    public function preview(VideoRoom $videoRoom): Response
    {
        return Inertia::render('video-rooms/preview', [
            'videoRoom' => $videoRoom,
        ]);
    }

    public function show(Request $request, VideoRoom $videoRoom): Response
    {
        if (! $videoRoom->room_sid) {
            $twilioRoom = $this->twilio->video->v1->rooms->create([
                'uniqueName' => $videoRoom->name,
                'type' => 'group',
            ]);

            $videoRoom->update(['room_sid' => $twilioRoom->sid]);
        }

        $token = $this->generateAccessToken($videoRoom->name);

        return Inertia::render('video-rooms/show', [
            'videoRoom' => $videoRoom,
            'token' => $token,
            'blur_strength' => session('blur_strength', 0),
        ]);
    }

    public function storeBlurStrength(Request $request): JsonResponse
    {
        $request->validate([
            'blur_strength' => 'required|integer|min:0|max:10',
        ]);

        session(['blur_strength' => $request->blur_strength]);

        return response()->json();
    }

    private function generateAccessToken($roomName): string
    {
        $userId = auth()->id();
        $token = new AccessToken(
            config('services.twilio.account_sid'),
            config('services.twilio.api_key'),
            config('services.twilio.api_secret'),
            3600,
            $userId,
        );

        $videoGrant = new VideoGrant;
        $videoGrant->setRoom($roomName);
        $token->addGrant($videoGrant);

        return $token->toJWT();
    }
}
