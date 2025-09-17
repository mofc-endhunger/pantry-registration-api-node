/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: { isolatedModules: true } }],
  },
  testRegex: '.*\\.e2e-spec\\.ts$',
  testTimeout: 30000,
  setupFiles: ['<rootDir>/test/jest.mysql.env.ts'],
};

