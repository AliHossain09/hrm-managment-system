<?php

namespace App\Console\Commands;

use App\LeaveManagementService;
use Illuminate\Console\Command;

class ResetYearlyLeaveBalances extends Command
{
    protected $signature = 'leave-balances:reset {year? : Optional year to initialize}';

    protected $description = 'Initialize yearly leave balances for employees based on workspace leave types';

    public function handle(LeaveManagementService $leaveManagementService): int
    {
        $year = $this->argument('year');

        $leaveManagementService->resetYearlyBalances($year ? (int) $year : null);

        $this->info('Yearly leave balances synchronized successfully.');

        return self::SUCCESS;
    }
}
