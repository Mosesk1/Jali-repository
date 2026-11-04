<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\V1\MomoGatewayController;

Route::get('/health', [MomoGatewayController::class, 'health']);
Route::post('/v1/momo/initialize', [MomoGatewayController::class, 'initializePayment']);
