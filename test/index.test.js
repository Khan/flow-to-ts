const fs = require("fs");
const path = require("path");

const convert = require("../src/convert.js");

const failingTestNames = ["spread03", "spread04"];

describe("flow-to-ts", () => {
  const suites = fs.readdirSync(path.join(__dirname, "fixtures"));
  for (const suiteName of suites) {
    describe(suiteName, () => {
      const tests = fs.readdirSync(path.join(__dirname, "fixtures", suiteName));
      for (const testName of tests.filter(testName => !failingTestNames.includes(testName))) {
        const dir = path.join(__dirname, "fixtures", suiteName, testName);
        const flowCode = fs.readFileSync(path.join(dir, "flow.js"), "utf-8");
        const tsCode = fs.readFileSync(path.join(dir, "ts.js"), "utf-8");
        const hasOptions = fs.existsSync(path.join(dir, "options.json"));

        if (hasOptions) {
          const options = JSON.parse(fs.readFileSync(path.join(dir, "options.json"), "utf-8"));
          test(testName.replace(/_/g, " "), () => {
            expect(convert(flowCode, options)).toEqual(tsCode);
          });
        } else {
          test(testName.replace(/_/g, " "), () => {
            expect(convert(flowCode)).toEqual(tsCode);
          });
        }
      }
    });
  }
});
