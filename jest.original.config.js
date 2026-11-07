module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/upstream/LoLProxChat/tests'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/', '/tests/cv/'],
  setupFiles: ['<rootDir>/upstream/LoLProxChat/tests/setup/browser-globals.ts'],
  // Run the original tests against the exact source copies actually bundled.
  moduleNameMapper: {'^(?:\\.\\./){2,3}src/(.*)$': '<rootDir>/src/upstream/$1'},
  transform: {'^.+\\.tsx?$': ['ts-jest', {tsconfig: '<rootDir>/tsconfig.test.json'}]},
};
