/** @type {import('jest').Config} */
const base = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { rootDir: '.' } }],
  },
};

module.exports = {
  projects: [
    {
      ...base,
      displayName: 'unit',
      testMatch: ['**/tests/**/*.test.ts'],
      testPathIgnorePatterns: ['/tests/integration/'],
    },
    {
      ...base,
      displayName: 'integration',
      testMatch: ['**/tests/integration/**/*.test.ts'],
    },
  ],
};
