import { Test } from '@nestjs/testing';

describe('Debug Mock Test', () => {
  it('should test mock behavior', async () => {
    const mockRepository = {
      findByQuery: jest.fn(),
    };

    const mockData = [
      {
        id: 'cache-1',
        query: 'test',
        title: 'Test Title',
        relevance: 0.9,
      },
    ];

    mockRepository.findByQuery.mockResolvedValue(mockData);
    
    const result = await mockRepository.findByQuery('test', { limit: 20 });
    
    console.log('Mock returned:', result);
    console.log('Is array?', Array.isArray(result));
    console.log('Length:', result.length);
    
    if (result && result.length > 0) {
      console.log('Mapped result:', result.map((item: any) => ({
        id: item.id,
        title: item.title,
        relevance: item.relevance,
      })));
    }
  });
});
