import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';

@Controller()
class TestController {
  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

async function bootstrap() {
  console.log('Creating NestJS application...');
  const app = await NestFactory.create(TestModule);
  const port = 3001;
  await app.listen(port);
  console.log(`Test application is running on: http://localhost:${port}`);
}

bootstrap().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});