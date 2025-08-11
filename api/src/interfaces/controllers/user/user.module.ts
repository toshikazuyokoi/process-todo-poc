import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { CreateUserUseCase } from '@application/usecases/user/create-user.usecase';
import { UpdateUserUseCase } from '@application/usecases/user/update-user.usecase';
import { GetUsersUseCase } from '@application/usecases/user/get-users.usecase';
import { DeleteUserUseCase } from '@application/usecases/user/delete-user.usecase';
import { AssignStepUseCase } from '@application/usecases/user/assign-step.usecase';
import { InfrastructureModule } from '@infrastructure/infrastructure.module';

@Module({
  imports: [InfrastructureModule],
  controllers: [UserController],
  providers: [
    CreateUserUseCase,
    UpdateUserUseCase,
    GetUsersUseCase,
    DeleteUserUseCase,
    AssignStepUseCase,
  ],
  exports: [
    CreateUserUseCase,
    UpdateUserUseCase,
    GetUsersUseCase,
    DeleteUserUseCase,
    AssignStepUseCase,
  ],
})
export class UserModule {}