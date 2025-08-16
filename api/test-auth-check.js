const request = require('supertest');

async function testAuthCheck() {
  try {
    // Test protected endpoint without auth - should get 401
    const response1 = await request('http://localhost:3001')
      .get('/api/users')
      .send();
    
    console.log('Users without auth - Status:', response1.status);
    if (response1.status === 401) {
      console.log('✓ Authentication is required');
    } else {
      console.log('✗ Authentication might not be required');
    }

    // Test auth endpoint - should work without auth
    const response2 = await request('http://localhost:3001')
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    console.log('Login - Status:', response2.status);
    console.log('Login - Body:', response2.body);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAuthCheck();