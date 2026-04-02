<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_types', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->string('leave_name');
            $table->unsignedInteger('leave_days');
            $table->timestamps();

            $table->unique(['workspace_id', 'leave_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_types');
    }
};
