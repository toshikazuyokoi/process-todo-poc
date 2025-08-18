module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.integration\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/index.ts',
    '!main.ts',
  ],
  coverageDirectory: '../coverage-integration',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/common/$1',
    '^@domain/(.*)$': '<rootDir>/domain/$1',
    '^@application/(.*)$': '<rootDir>/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
    '^@interfaces/(.*)$': '<rootDir>/interfaces/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/../test/setup-integration.ts'],
  testTimeout: 0,
  maxWorkers: 1, // Run tests sequentially for database consistency
};
