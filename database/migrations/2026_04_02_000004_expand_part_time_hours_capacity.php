<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE users MODIFY part_time_hours INT UNSIGNED NULL');
        DB::statement('ALTER TABLE part_time_hour_options MODIFY hours INT UNSIGNED NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE users MODIFY part_time_hours TINYINT UNSIGNED NULL');
        DB::statement('ALTER TABLE part_time_hour_options MODIFY hours TINYINT UNSIGNED NOT NULL');
    }
};
