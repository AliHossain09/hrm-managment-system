<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('super_admin_accounts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('owner_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('super_admin_user_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('phone', 32)->nullable();
            $table->string('address', 255)->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamp('subscription_starts_at')->nullable();
            $table->timestamp('subscription_ends_at')->nullable();
            $table->unsignedInteger('billing_cycle_days')->default(30);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['owner_user_id', 'status']);
            $table->index(['subscription_ends_at']);
        });

        Schema::create('workspaces', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('super_admin_account_id')->constrained('super_admin_accounts')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('status', 20)->default('active');
            $table->timestamp('subscription_starts_at')->nullable();
            $table->timestamp('subscription_ends_at')->nullable();
            $table->timestamps();

            $table->index(['super_admin_account_id', 'status']);
            $table->index(['subscription_ends_at']);
        });

        Schema::create('workspace_user_roles', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('workspace_id')->constrained('workspaces')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role', 32);
            $table->timestamps();

            $table->unique(['workspace_id', 'user_id']);
            $table->index(['user_id', 'role']);
        });

        Schema::create('subscription_payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('super_admin_account_id')->constrained('super_admin_accounts')->cascadeOnDelete();
            $table->string('payment_method', 32);
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10)->default('BDT');
            $table->string('status', 20)->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->string('reference', 120)->nullable();
            $table->text('meta')->nullable();
            $table->timestamps();

            $table->index(['super_admin_account_id', 'status']);
            $table->index(['payment_method', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
        Schema::dropIfExists('workspace_user_roles');
        Schema::dropIfExists('workspaces');
        Schema::dropIfExists('super_admin_accounts');
    }
};
