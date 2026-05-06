/** @type {import('jest').Config} */
const base = require('./jest.config.cjs');

module.exports = {
  ...base,
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage/contracts',
  coverageReporters: ['text-summary', 'lcov', 'json-summary', 'html'],
  collectCoverageFrom: [
    '<rootDir>/src/common/projections/lead.projection.ts',
    '<rootDir>/src/common/projections/application.projection.ts',
    '<rootDir>/src/common/projections/reservation.projection.ts',
    '<rootDir>/src/common/projections/departure.projection.ts',
    '<rootDir>/src/common/projections/completion.projection.ts',
    '<rootDir>/src/common/projections/client.projection.ts',
  ],
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};
