/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/**/*.test.ts'],
  testTimeout: 30000,
  setupFiles: ['<rootDir>/test/setEnv.js'],
};
