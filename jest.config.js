module.exports = {
  testMatch: ["<rootDir>/test/*.test.ts"],
  // TODO: write a custom transform that checks for @flow comments and then
  // uses babel to transform the file with either the flow preset or the typescript
  // preset.
  transform: {
    "^.+\\.(ts|tsx|js)$": "<rootDir>/jest.transformer.js",
  },
  modulePathIgnorePatterns: ["babel/packages/babel-core"],
  moduleNameMapper: {
    "^@babel/(.*)$": "<rootDir>/babel/packages/babel-$1/src/index",
  },
};
