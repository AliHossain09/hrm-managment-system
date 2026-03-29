<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('roles')) {
            return;
        }

        Schema::create('roles', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('guard_name')->default('web');
            $table->integer('created_by')->default(0);
            $table->timestamps();

            $table->index(['guard_name', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};

