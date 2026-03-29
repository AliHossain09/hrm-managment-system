<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            if (! Schema::hasColumn('users', 'api_token')) {
                $table->text('api_token')->nullable()->after('email');
            }
            if (! Schema::hasColumn('users', 'type')) {
                $table->string('type', 100)->nullable()->after('password');
            }
            if (! Schema::hasColumn('users', 'avatar')) {
                $table->string('avatar', 100)->nullable()->after('type');
            }
            if (! Schema::hasColumn('users', 'is_active')) {
                $table->integer('is_active')->default(1)->after('avatar');
            }
            if (! Schema::hasColumn('users', 'last_login_at')) {
                $table->dateTime('last_login_at')->nullable()->after('remember_token');
            }
            if (! Schema::hasColumn('users', 'user_type')) {
                $table->string('user_type', 50)->nullable()->after('is_active');
            }
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'api_token')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('api_token');
            });
        }

        if (Schema::hasColumn('users', 'type')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('type');
            });
        }

        if (Schema::hasColumn('users', 'avatar')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('avatar');
            });
        }

        if (Schema::hasColumn('users', 'is_active')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('is_active');
            });
        }

        if (Schema::hasColumn('users', 'last_login_at')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('last_login_at');
            });
        }

        if (Schema::hasColumn('users', 'user_type')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('user_type');
            });
        }
    }
};

