console.log('Starting test...');

async function test() {
  console.log('1. Loading NestJS core...');
  const { NestFactory } = require('@nestjs/core');
  console.log('2. NestFactory loaded');
  
  const { Module, Controller, Get } = require('@nestjs/common');
  console.log('3. Common decorators loaded');
  
  @Controller()
  class TestController {
    @Get('health')
    getHealth() {
      return { status: 'ok' };
    }
  }
  
  @Module({
    controllers: [TestController],
  })
  class TestModule {}
  
  console.log('4. Creating app...');
  try {
    const app = await NestFactory.create(TestModule);
    console.log('5. App created, listening...');
    await app.listen(3001);
    console.log('6. Server is running on port 3001');
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  }
}

test().catch(console.error);