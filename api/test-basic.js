console.log('Starting basic test...');

async function test() {
  try {
    console.log('1. Test NestJS loading...');
    const core = require('@nestjs/core');
    console.log('2. Core module loaded:', typeof core.NestFactory);
    
    console.log('3. Loading app module...');
    const appModule = require('./dist/app.module');
    console.log('4. App module loaded:', typeof appModule.AppModule);
    
    console.log('5. Creating NestJS app...');
    const app = await core.NestFactory.create(appModule.AppModule);
    console.log('6. App created successfully!');
    
    await app.listen(3001);
    console.log('7. Server is running on port 3001');
  } catch (error) {
    console.error('Error occurred:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();