const request = require('supertest');

async function testDirectAuth() {
  try {
    console.log('Testing authentication on UserController...\n');
    
    // Test 1: GET /api/users without auth
    console.log('1. GET /api/users without auth:');
    const response1 = await request('http://localhost:3001')
      .get('/api/users')
      .send();
    console.log('   Status:', response1.status);
    console.log('   Headers:', response1.headers);
    
    // Test 2: GET /api/comments/steps/1 without auth
    console.log('\n2. GET /api/comments/steps/1 without auth:');
    const response2 = await request('http://localhost:3001')
      .get('/api/comments/steps/1')
      .send();
    console.log('   Status:', response2.status);
    
    // Test 3: GET /api/steps/1 without auth
    console.log('\n3. GET /api/steps/1 without auth:');
    const response3 = await request('http://localhost:3001')
      .get('/api/steps/1')
      .send();
    console.log('   Status:', response3.status);

    // Test 4: GET /api/cases without auth
    console.log('\n4. GET /api/cases without auth:');
    const response4 = await request('http://localhost:3001')
      .get('/api/cases')
      .send();
    console.log('   Status:', response4.status);
    
    console.log('\n=== Summary ===');
    const statuses = [response1.status, response2.status, response3.status, response4.status];
    const has401 = statuses.some(s => s === 401);
    const hasNon401 = statuses.some(s => s !== 401);
    
    if (has401 && hasNon401) {
      console.log('⚠️  INCONSISTENT: Some endpoints require auth, others don\'t');
    } else if (has401) {
      console.log('✓ Authentication is properly enforced');
    } else {
      console.log('✗ Authentication is NOT enforced on any endpoint');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDirectAuth();