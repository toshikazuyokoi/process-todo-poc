const request = require('supertest');

async function testAuthPost() {
  try {
    // Test POST without authentication
    const response1 = await request('http://localhost:3001')
      .post('/api/comments')
      .send({
        stepId: 1,
        userId: 1,
        content: 'Test comment'
      });
    
    console.log('POST without auth - Status:', response1.status);
    console.log('POST without auth - Body:', response1.body);

    // Test POST with mock authentication header  
    const response2 = await request('http://localhost:3001')
      .post('/api/comments')
      .set('Authorization', 'Bearer fake-token')
      .send({
        stepId: 1,
        userId: 1,
        content: 'Test comment with auth'
      });
    
    console.log('POST with auth - Status:', response2.status);
    console.log('POST with auth - Body:', response2.body);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAuthPost();