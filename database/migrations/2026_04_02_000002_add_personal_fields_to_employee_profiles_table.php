<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table): void {
            if (! Schema::hasColumn('employee_profiles', 'phone')) {
                $table->string('phone', 32)->nullable()->after('address');
            }
            if (! Schema::hasColumn('employee_profiles', 'national_id_card_number')) {
                $table->string('national_id_card_number', 64)->nullable()->after('phone');
            }
            if (! Schema::hasColumn('employee_profiles', 'sex')) {
                $table->string('sex', 16)->nullable()->after('national_id_card_number');
            }
            if (! Schema::hasColumn('employee_profiles', 'blood_group')) {
                $table->string('blood_group', 10)->nullable()->after('sex');
            }
            if (! Schema::hasColumn('employee_profiles', 'father_name')) {
                $table->string('father_name', 120)->nullable()->after('blood_group');
            }
            if (! Schema::hasColumn('employee_profiles', 'mother_name')) {
                $table->string('mother_name', 120)->nullable()->after('father_name');
            }
            if (! Schema::hasColumn('employee_profiles', 'father_phone')) {
                $table->string('father_phone', 32)->nullable()->after('mother_name');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employee_profiles', function (Blueprint $table): void {
            foreach (['father_phone', 'mother_name', 'father_name', 'blood_group', 'sex', 'national_id_card_number', 'phone'] as $column) {
                if (Schema::hasColumn('employee_profiles', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
