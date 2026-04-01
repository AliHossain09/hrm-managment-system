<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $table->date('start_date');
            $table->date('end_date');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
