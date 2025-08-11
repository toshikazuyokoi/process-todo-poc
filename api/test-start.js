const { NestFactory } = require('@nestjs/core');

async function testStart() {
  console.log('Starting test...');
  try {
    // Try to load the AppModule
    const { AppModule } = require('./dist/app.module');
    console.log('AppModule loaded successfully');
    
    const app = await NestFactory.create(AppModule);
    console.log('NestJS app created');
    
    await app.listen(3001);
    console.log('Server listening on port 3001');
  } catch (error) {
    console.error('Error starting application:', error.message);
    console.error(error.stack);
  }
}

testStart();