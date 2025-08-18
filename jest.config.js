module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    // If you use path aliases like "@/services/updates", map them here:
    // "^@/(.*)$": "<rootDir>/src/$1",
  },
};
