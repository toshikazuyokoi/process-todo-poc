import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { ProcessTemplateModule } from './interfaces/controllers/process-template/process-template.module';
import { CaseModule } from './interfaces/controllers/case/case.module';
import { StepModule } from './interfaces/controllers/step/step.module';
import { AuthModule } from './interfaces/controllers/auth/auth.module';
import { DebugModule } from './interfaces/controllers/debug/debug.module';
import { ArtifactModule } from './interfaces/controllers/artifact/artifact.module';
import { UserModule } from './interfaces/controllers/user/user.module';
import { CommentModule } from './interfaces/controllers/comment/comment.module';
import { NotificationModule } from './interfaces/controllers/notification/notification.module';
import { GanttModule } from './interfaces/controllers/gantt/gantt.module';
import { SearchModule } from './interfaces/controllers/search/search.module';
import { CalendarModule } from './interfaces/controllers/calendar/calendar.module';
import { KanbanModule } from './interfaces/controllers/kanban/kanban.module';
import { TestModule } from './interfaces/controllers/test/test.module';
import { CustomLoggerService } from './common/services/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    ProcessTemplateModule,
    CaseModule,
    StepModule,
    AuthModule,
    DebugModule,
    ArtifactModule,
    UserModule,
    CommentModule,
    NotificationModule,
    GanttModule,
    SearchModule,
    CalendarModule,
    KanbanModule,
    // Test module (E2E環境でのみ有効)
    ...(process.env.NODE_ENV === 'e2e' || process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' 
      ? [TestModule] 
      : []),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: 'LoggerService',
      useClass: CustomLoggerService,
    },
  ],
  exports: ['LoggerService'],
})
export class AppModule {}