// Debug script to understand the mock issue
const testFile = `
describe('Debug Test', () => {
  it('should test mock return', async () => {
    const mockCacheRepository = {
      findByQuery: jest.fn(),
      storeBatch: jest.fn(),
    };

    const mockCachedResults = [
      {
        id: 'cache-1',
        query: 'agile development best practices',
        title: 'Agile Manifesto Principles',
        content: 'Core principles of agile development',
        description: 'Core principles of agile development',
        url: 'https://agilemanifesto.org',
        relevance: 0.9,
        source: 'web',
        author: 'Agile Alliance',
        publishedAt: new Date('2023-06-01'),
        tags: ['agile'],
        citations: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    ];

    mockCacheRepository.findByQuery.mockResolvedValue(mockCachedResults);
    
    const result = await mockCacheRepository.findByQuery('test', {});
    
    console.log('Mock returned:', JSON.stringify(result, null, 2));
    console.log('Result length:', result.length);
    console.log('Result is array:', Array.isArray(result));
    console.log('First item:', result[0]);
  });
});
`;

console.log('Testing mock behavior...');
