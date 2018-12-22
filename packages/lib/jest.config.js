module.exports = {
  cacheDirectory: '<rootDir>/.cache/jest',
  clearMocks: true,
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.{js,ts}"
  ],
  moduleFileExtensions: ["ts", "js", "json"],
  notify: !process.env.DISABALE_JEST_NOTIFY,
  notifyMode: 'success-change',
  testEnvironment: "node",
  testMatch: ['**/*\\.test.(js|ts)'],
  transform: {
    "^.+\\.ts$": "ts-jest",
  }
};
