import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CreateUserUseCase, CreateUserDto } from '@application/usecases/user/create-user.usecase';
import { UpdateUserUseCase, UpdateUserDto } from '@application/usecases/user/update-user.usecase';
import { GetUsersUseCase, GetUsersFilterDto } from '@application/usecases/user/get-users.usecase';
import { DeleteUserUseCase } from '@application/usecases/user/delete-user.usecase';
import { AssignStepUseCase, AssignStepDto } from '@application/usecases/user/assign-step.usecase';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
    private readonly assignStepUseCase: AssignStepUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.createUserUseCase.execute(dto);
    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail(),
      role: user.getRole(),
      timezone: user.getTimezone(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role' })
  @ApiQuery({ name: 'searchTerm', required: false, description: 'Search by name or email' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async getUsers(@Query() filter: GetUsersFilterDto) {
    const users = await this.getUsersUseCase.execute(filter);
    return users.map(user => ({
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail(),
      role: user.getRole(),
      timezone: user.getTimezone(),
    }));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    const user = await this.updateUserUseCase.execute(id, dto);
    return {
      id: user.getId(),
      name: user.getName(),
      email: user.getEmail(),
      role: user.getRole(),
      timezone: user.getTimezone(),
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'User has assigned steps' })
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.deleteUserUseCase.execute(id);
  }

  @Post('assign-step')
  @ApiOperation({ summary: 'Assign a step to a user' })
  @ApiResponse({ status: 200, description: 'Step assigned successfully' })
  @ApiResponse({ status: 404, description: 'User or step not found' })
  async assignStep(@Body() dto: AssignStepDto) {
    const step = await this.assignStepUseCase.execute(dto);
    return {
      stepId: step.getId(),
      stepName: step.getName(),
      assigneeId: step.getAssigneeId(),
      status: step.getStatus().toString(),
    };
  }
}