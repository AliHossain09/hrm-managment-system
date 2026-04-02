<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hrm_user_roles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('name', 120);
            $table->timestamps();

            $table->unique(['workspace_id', 'name']);
        });

        Schema::create('user_type_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('name', 50);
            $table->boolean('is_part_time')->default(false);
            $table->timestamps();

            $table->unique(['workspace_id', 'name']);
        });

        Schema::create('part_time_hour_options', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->unsignedTinyInteger('hours');
            $table->timestamps();

            $table->unique(['workspace_id', 'hours']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('part_time_hour_options');
        Schema::dropIfExists('user_type_options');
        Schema::dropIfExists('hrm_user_roles');
    }
};
