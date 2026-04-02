<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Designation;
use App\Models\HrmUserRole;
use App\Models\PartTimeHourOption;
use App\Models\User;
use App\Models\UserTypeOption;
use App\Services\AuthService;
use App\Traits\RespondsWithMessages;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HrmCatalogController extends Controller
{
    use RespondsWithMessages;

    public function indexUserRoles(Request $request, AuthService $authService): JsonResponse
    {
        return $this->indexNameBased($request, $authService, HrmUserRole::class, 'user_roles', 'User roles loaded.');
    }

    public function storeUserRole(Request $request, AuthService $authService): JsonResponse
    {
        return $this->storeNameBased($request, $authService, HrmUserRole::class, 'User role created successfully.');
    }

    public function updateUserRole(Request $request, HrmUserRole $role, AuthService $authService): JsonResponse
    {
        return $this->updateNameBased($request, $authService, $role, 'User role updated successfully.');
    }

    public function destroyUserRole(Request $request, HrmUserRole $role, AuthService $authService): JsonResponse
    {
        return $this->destroyNameBased($request, $authService, $role, 'User role deleted successfully.');
    }

    public function indexDepartments(Request $request, AuthService $authService): JsonResponse
    {
        return $this->indexNameBased($request, $authService, Department::class, 'departments', 'Departments loaded.');
    }

    public function storeDepartment(Request $request, AuthService $authService): JsonResponse
    {
        return $this->storeNameBased($request, $authService, Department::class, 'Department created successfully.');
    }

    public function updateDepartment(Request $request, Department $department, AuthService $authService): JsonResponse
    {
        return $this->updateNameBased($request, $authService, $department, 'Department updated successfully.');
    }

    public function destroyDepartment(Request $request, Department $department, AuthService $authService): JsonResponse
    {
        return $this->destroyNameBased($request, $authService, $department, 'Department deleted successfully.');
    }

    public function indexDesignations(Request $request, AuthService $authService): JsonResponse
    {
        return $this->indexNameBased($request, $authService, Designation::class, 'designations', 'Designations loaded.');
    }

    public function storeDesignation(Request $request, AuthService $authService): JsonResponse
    {
        return $this->storeNameBased($request, $authService, Designation::class, 'Designation created successfully.');
    }

    public function updateDesignation(Request $request, Designation $designation, AuthService $authService): JsonResponse
    {
        return $this->updateNameBased($request, $authService, $designation, 'Designation updated successfully.');
    }

    public function destroyDesignation(Request $request, Designation $designation, AuthService $authService): JsonResponse
    {
        return $this->destroyNameBased($request, $authService, $designation, 'Designation deleted successfully.');
    }

    public function indexUserTypes(Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0) {
            return $this->errorResponse('Only master admin with workspace can manage HRM catalogs.', 403);
        }

        $items = UserTypeOption::query()
            ->where('workspace_id', $workspaceId)
            ->orderBy('id')
            ->get()
            ->map(fn (UserTypeOption $item): array => [
                'id' => $item->id,
                'name' => $item->name,
                'is_part_time' => (bool) $item->is_part_time,
                'created_at' => optional($item->created_at)->format('Y-m-d H:i:s'),
            ])
            ->values();

        return $this->successResponse([
            'user_types' => $items,
        ], 'User types loaded.');
    }

    public function storeUserType(Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0) {
            return $this->errorResponse('Only master admin with workspace can manage HRM catalogs.', 403);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('user_type_options', 'name')->where(fn ($query) => $query->where('workspace_id', $workspaceId)),
            ],
            'is_part_time' => ['nullable', 'boolean'],
        ]);

        $item = UserTypeOption::query()->create([
            'workspace_id' => $workspaceId,
            'name' => $validated['name'],
            'is_part_time' => (bool) ($validated['is_part_time'] ?? false),
        ]);

        return $this->successResponse([
            'id' => $item->id,
            'name' => $item->name,
            'is_part_time' => (bool) $item->is_part_time,
            'created_at' => optional($item->created_at)->format('Y-m-d H:i:s'),
        ], 'User type created successfully.', 201);
    }

    public function updateUserType(Request $request, UserTypeOption $userTypeOption, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0 || (int) $userTypeOption->workspace_id !== $workspaceId) {
            return $this->errorResponse('You cannot update user type from another workspace.', 403);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('user_type_options', 'name')
                    ->ignore($userTypeOption->id)
                    ->where(fn ($query) => $query->where('workspace_id', $workspaceId)),
            ],
            'is_part_time' => ['nullable', 'boolean'],
        ]);

        $userTypeOption->update([
            'name' => $validated['name'],
            'is_part_time' => (bool) ($validated['is_part_time'] ?? false),
        ]);

        return $this->successResponse([
            'id' => $userTypeOption->id,
            'name' => $userTypeOption->name,
            'is_part_time' => (bool) $userTypeOption->is_part_time,
            'created_at' => optional($userTypeOption->created_at)->format('Y-m-d H:i:s'),
        ], 'User type updated successfully.');
    }

    public function destroyUserType(Request $request, UserTypeOption $userTypeOption, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0 || (int) $userTypeOption->workspace_id !== $workspaceId) {
            return $this->errorResponse('You cannot delete user type from another workspace.', 403);
        }

        $userTypeOption->delete();

        return $this->successResponse(null, 'User type deleted successfully.');
    }

    public function indexPartTimeHours(Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0) {
            return $this->errorResponse('Only master admin with workspace can manage HRM catalogs.', 403);
        }

        $items = PartTimeHourOption::query()
            ->where('workspace_id', $workspaceId)
            ->orderBy('hours')
            ->get()
            ->map(fn (PartTimeHourOption $item): array => [
                'id' => $item->id,
                'hours' => (int) $item->hours,
                'created_at' => optional($item->created_at)->format('Y-m-d H:i:s'),
            ])
            ->values();

        return $this->successResponse([
            'part_time_hours' => $items,
        ], 'Part time hours loaded.');
    }

    public function storePartTimeHour(Request $request, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0) {
            return $this->errorResponse('Only master admin with workspace can manage HRM catalogs.', 403);
        }

        $validated = $request->validate([
            'hours' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('part_time_hour_options', 'hours')->where(fn ($query) => $query->where('workspace_id', $workspaceId)),
            ],
        ]);

        $item = PartTimeHourOption::query()->create([
            'workspace_id' => $workspaceId,
            'hours' => (int) $validated['hours'],
        ]);

        return $this->successResponse([
            'id' => $item->id,
            'hours' => (int) $item->hours,
            'created_at' => optional($item->created_at)->format('Y-m-d H:i:s'),
        ], 'Part time hours created successfully.', 201);
    }

    public function updatePartTimeHour(Request $request, PartTimeHourOption $partTimeHourOption, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0 || (int) $partTimeHourOption->workspace_id !== $workspaceId) {
            return $this->errorResponse('You cannot update part time hour from another workspace.', 403);
        }

        $validated = $request->validate([
            'hours' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('part_time_hour_options', 'hours')
                    ->ignore($partTimeHourOption->id)
                    ->where(fn ($query) => $query->where('workspace_id', $workspaceId)),
            ],
        ]);

        $partTimeHourOption->update([
            'hours' => (int) $validated['hours'],
        ]);

        return $this->successResponse([
            'id' => $partTimeHourOption->id,
            'hours' => (int) $partTimeHourOption->hours,
            'created_at' => optional($partTimeHourOption->created_at)->format('Y-m-d H:i:s'),
        ], 'Part time hours updated successfully.');
    }

    public function destroyPartTimeHour(Request $request, PartTimeHourOption $partTimeHourOption, AuthService $authService): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0 || (int) $partTimeHourOption->workspace_id !== $workspaceId) {
            return $this->errorResponse('You cannot delete part time hour from another workspace.', 403);
        }

        $partTimeHourOption->delete();

        return $this->successResponse(null, 'Part time hours deleted successfully.');
    }

    private function indexNameBased(Request $request, AuthService $authService, string $modelClass, string $responseKey, string $message): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0) {
            return $this->errorResponse('Only master admin with workspace can manage HRM catalogs.', 403);
        }

        $items = $modelClass::query()
            ->where('workspace_id', $workspaceId)
            ->orderBy('id')
            ->get()
            ->map(fn (Model $item): array => [
                'id' => $item->id,
                'name' => $item->name,
                'created_at' => optional($item->created_at)->format('Y-m-d H:i:s'),
            ])
            ->values();

        return $this->successResponse([
            $responseKey => $items,
        ], $message);
    }

    private function storeNameBased(Request $request, AuthService $authService, string $modelClass, string $message): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0) {
            return $this->errorResponse('Only master admin with workspace can manage HRM catalogs.', 403);
        }

        /** @var Model $model */
        $model = new $modelClass();

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:120',
                Rule::unique($model->getTable(), 'name')->where(fn ($query) => $query->where('workspace_id', $workspaceId)),
            ],
        ]);

        $item = $modelClass::query()->create([
            'workspace_id' => $workspaceId,
            'name' => $validated['name'],
        ]);

        return $this->successResponse([
            'id' => $item->id,
            'name' => $item->name,
            'created_at' => optional($item->created_at)->format('Y-m-d H:i:s'),
        ], $message, 201);
    }

    private function updateNameBased(Request $request, AuthService $authService, Model $item, string $message): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0 || (int) $item->workspace_id !== $workspaceId) {
            return $this->errorResponse('You cannot update item from another workspace.', 403);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:120',
                Rule::unique($item->getTable(), 'name')
                    ->ignore($item->id)
                    ->where(fn ($query) => $query->where('workspace_id', $workspaceId)),
            ],
        ]);

        $item->update([
            'name' => $validated['name'],
        ]);

        return $this->successResponse([
            'id' => $item->id,
            'name' => $item->name,
            'created_at' => optional($item->created_at)->format('Y-m-d H:i:s'),
        ], $message);
    }

    private function destroyNameBased(Request $request, AuthService $authService, Model $item, string $message): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $workspaceId = $this->validateMasterWorkspace($user, $authService);
        if ($workspaceId <= 0 || (int) $item->workspace_id !== $workspaceId) {
            return $this->errorResponse('You cannot delete item from another workspace.', 403);
        }

        $item->delete();

        return $this->successResponse(null, $message);
    }

    private function validateMasterWorkspace(User $user, AuthService $authService): int
    {
        if (! $authService->isMasterAdmin($user)) {
            return 0;
        }

        return (int) ($user->current_workspace_id ?? 0);
    }
}


