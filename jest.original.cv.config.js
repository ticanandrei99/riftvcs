const config=require('./jest.original.config');
module.exports={...config,testMatch:['**/tests/cv/*.test.ts'],testPathIgnorePatterns:['/node_modules/','/tests/e2e/']};
