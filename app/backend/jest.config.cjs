/** @type {import('jest').Config} */
module.exports = {
  testTimeout: 30_000,
  projects: [
    {
      displayName: 'api-contract',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/test/api-contract/**/*.spec.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      clearMocks: true,
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
      },
      moduleFileExtensions: ['ts', 'js', 'json'],
      clearMocks: true,
    },
  ],
};
