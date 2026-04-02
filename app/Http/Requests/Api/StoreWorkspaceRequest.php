<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkspaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'workspace_logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'master_admin_email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'master_admin_password' => ['required', 'string', 'min:6', 'max:120'],
            'master_admin_phone' => ['nullable', 'string', 'max:32'],
            'master_admin_address' => ['nullable', 'string', 'max:255'],
        ];
    }
}
