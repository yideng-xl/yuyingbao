module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: [
    'pages/**/*.js',
    '!pages/**/node_modules/**'
  ],
  setupFiles: ['<rootDir>/test/setup.js']
};