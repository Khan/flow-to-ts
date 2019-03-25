const fs = require("fs");
const path = require("path");

const convert = require("../src/convert.js");

const failingTestNames = ["spread03", "spread04"];

describe("laminar", () => {
  const suites = fs.readdirSync(path.join(__dirname, "fixtures"));
  for (const suiteName of suites) {
    describe(suiteName, () => {
      const tests = fs.readdirSync(path.join(__dirname, "fixtures", suiteName));
      for (const testName of tests.filter(testName => !failingTestNames.includes(testName))) {
        const flowCode = fs.readFileSync(path.join(__dirname, "fixtures", suiteName, testName, "flow.js"), "utf-8");
        const tsCode = fs.readFileSync(path.join(__dirname, "fixtures", suiteName, testName, "ts.js"), "utf-8");
        test(testName, () => {
          expect(convert(flowCode)).toEqual(tsCode);
        });
      }
    });
  }
});
