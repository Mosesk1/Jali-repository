<?php

namespace App\Http\Controllers\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MomoGatewayController extends Controller
{
    public function initializePayment(Request $request)
    {
        $data = $request->validate([
            'provider' => 'required|string',
            'transaction_id' => 'required|string',
            'amount' => 'required|numeric|gt:0',
            'currency' => 'nullable|string',
        ]);

        $secret = env('SHARED_SECRET', 'jali_secret_123');
        $callbackUrl = env('SYSTEM_A_WEBHOOK_URL', 'http://127.0.0.1:3000/webhooks/momo-callback');

        $callback = [
            'provider' => strtoupper($data['provider']),
            'transaction_id' => $data['transaction_id'],
            'amount' => (float) $data['amount'],
            'currency' => strtoupper($data['currency'] ?? 'RWF'),
            'status' => 'SUCCESS',
            'timestamp' => now()->toIso8601String(),
        ];

        $body = json_encode($callback, JSON_UNESCAPED_SLASHES);
        $signature = hash_hmac('sha256', $body, $secret);

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'X-JaKo-Signature' => $signature,
                    'Content-Type' => 'application/json',
                ])
                ->withBody($body, 'application/json')
                ->post($callbackUrl);

            if ($response->failed()) {
                Log::error('callback failed', ['status' => $response->status()]);
                return response()->json(['gateway_status' => 'DELIVERY_FAILED'], 502);
            }

            return response()->json([
                'gateway_status' => 'PROCESSED',
                'callback' => $callback,
            ]);
        } catch (\Exception $e) {
            Log::error('callback timeout', ['error' => $e->getMessage()]);
            return response()->json(['gateway_status' => 'DELIVERY_TIMEOUT'], 500);
        }
    }

    public function health()
    {
        return response()->json(['status' => 'ok']);
    }
}
