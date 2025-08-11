console.log('Starting test...');

const { NestFactory } = require('@nestjs/core');
const { Module, Controller, Get } = require('@nestjs/common');

console.log('Modules loaded');

class TestController {
  constructor() {
    console.log('TestController created');
  }
  
  getHealth() {
    return { status: 'ok' };
  }
}

Reflect.defineMetadata('path', 'health', TestController.prototype, 'getHealth');
Reflect.defineMetadata('method', 'GET', TestController.prototype, 'getHealth');

const TestModule = class {};
Reflect.defineMetadata('controllers', [TestController], TestModule);

async function bootstrap() {
  console.log('Bootstrap starting...');
  try {
    const app = await NestFactory.create(TestModule);
    console.log('App created');
    await app.listen(3001);
    console.log('Server listening on port 3001');
  } catch (err) {
    console.error('Error:', err);
  }
}

bootstrap();