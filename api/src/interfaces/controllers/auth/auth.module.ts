import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthModule as InfraAuthModule } from '../../../infrastructure/auth/auth.module';

@Module({
  imports: [InfraAuthModule],
  controllers: [AuthController],
  providers: [],
})
export class AuthModule {}