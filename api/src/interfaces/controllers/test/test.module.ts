import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { PrismaModule } from '@infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TestController],
})
export class TestModule {}