import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SocketGateway } from './socket.gateway';
import { SocketAuthGuard } from './socket-auth.guard';
import { GetInterviewSessionUseCase } from '../../application/usecases/ai-agent/get-interview-session.usecase';
import { AICacheModule } from '../cache/cache.module';
import { DomainModule } from '../../domain/domain.module';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
    AICacheModule, // Required for GetInterviewSessionUseCase
    DomainModule,  // Required for repositories
  ],
  providers: [
    SocketGateway, 
    SocketAuthGuard,
    GetInterviewSessionUseCase, // Added for session status requests
  ],
  exports: [SocketGateway],
})
export class WebSocketModule {}