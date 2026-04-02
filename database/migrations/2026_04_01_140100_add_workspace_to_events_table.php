<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table): void {
            if (! Schema::hasColumn('events', 'workspace_id')) {
                $table->foreignId('workspace_id')->nullable()->after('id')->constrained('workspaces')->nullOnDelete();
                $table->index(['workspace_id', 'start_date']);
            }
        });
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table): void {
            if (Schema::hasColumn('events', 'workspace_id')) {
                $table->dropConstrainedForeignId('workspace_id');
            }
        });
    }
};
