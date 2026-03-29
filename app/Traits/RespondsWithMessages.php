<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait RespondsWithMessages
{
    protected function flashSuccess(string $message): void
    {
        session()->flash('success', $message);
    }

    protected function flashError(string $message): void
    {
        session()->flash('error', $message);
    }

    protected function successResponse(mixed $data, string $message = 'Success', int $status = 200): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function errorResponse(string $message = 'Something went wrong', int $status = 422, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'message' => $message,
            'errors' => $errors,
        ], $status);
    }
}

