const request = require('supertest');

async function testAuth() {
  try {
    // Test without authentication
    const response1 = await request('http://localhost:3001')
      .get('/api/comments/steps/1')
      .send();
    
    console.log('Without auth - Status:', response1.status);
    console.log('Without auth - Body:', response1.body);

    // Test with mock authentication header  
    const response2 = await request('http://localhost:3001')
      .get('/api/comments/steps/1')
      .set('Authorization', 'Bearer fake-token')
      .send();
    
    console.log('With auth - Status:', response2.status);
    console.log('With auth - Body:', response2.body);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAuth();