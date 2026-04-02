<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class UpdateEmployeeDetailsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date_of_birth' => ['nullable', 'date'],
            'date_of_joining' => ['nullable', 'date'],
            'basic_salary' => ['nullable', 'numeric', 'min:0', 'max:999999999.99'],
            'branch_name' => ['nullable', 'string', 'max:120'],
            'department_name' => ['nullable', 'string', 'max:120'],
            'designation_name' => ['nullable', 'string', 'max:120'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'bank_branch_location' => ['nullable', 'string', 'max:160'],
            'bank_account_number' => ['nullable', 'string', 'max:120'],
            'address' => ['nullable', 'string', 'max:1000'],
            'phone' => ['nullable', 'string', 'max:32'],
            'national_id_card_number' => ['nullable', 'string', 'max:64'],
            'sex' => ['nullable', 'string', 'in:male,female,other'],
            'blood_group' => ['nullable', 'string', 'max:10'],
            'father_name' => ['nullable', 'string', 'max:120'],
            'mother_name' => ['nullable', 'string', 'max:120'],
            'father_phone' => ['nullable', 'string', 'max:32'],
        ];
    }
}
