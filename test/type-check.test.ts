import ts from "typescript";
import tmp from "tmp";
import fs from "fs";
import path from "path";
import { execFile, spawnSync } from "child_process";
import flow from "flow-bin";

import "./matchers";

import { convert } from "../src/convert";

const tsOptions = {
  filename: "foo.ts",
  reportDiagnostics: true,
};

tmp.setGracefulCleanup();

// @ts-ignore
const tmpobj = tmp.dirSync();
const fixturesPath = path.join(__dirname, "fixtures", "type-check");

const convertAndGetDiagnostics = (basename) => {
  const value = fs.readFileSync(
    path.join(fixturesPath, `${basename}.js`),
    "utf-8"
  );
  const tsFilename = path.join(tmpobj.name, `${basename}.ts`);
  fs.writeFileSync(tsFilename, convert(value));
  const prog = ts.createProgram([tsFilename], { lib: [] });

  // Getting diagnostics for a single file is a lot faster than getting them
  // for a whoel program, even if the program only contains a single file.
  const sf = prog.getSourceFile(tsFilename);
  return ts.getPreEmitDiagnostics(prog, sf).map((diag) => diag.messageText);
};

describe("type-checking", () => {
  const flowResults = {};

  const spawn = spawnSync(flow, ["--json"], { cwd: fixturesPath });
  const stdout = spawn.stdout.toString().trim();

  const errors = JSON.parse(stdout).errors;
  for (const error of errors) {
    for (const message of error.message) {
      const filename = path.relative(fixturesPath, message.path);
      if (!flowResults.hasOwnProperty(filename)) {
        flowResults[filename] = [];
      }
      flowResults[filename].push(message.descr);
    }
  }

  it("simple-types-fail", () => {
    const diagnostics = convertAndGetDiagnostics("simple-types-fail");

    expect(diagnostics).toEqual([
      "Type 'number' is not assignable to type 'string'.",
      "Type 'boolean' is not assignable to type 'number'.",
      "Type 'string' is not assignable to type 'boolean'.",
    ]);
    expect(flowResults["simple-types-fail.js"]).toEqual([
      "Cannot assign `5` to `foo` because number [1] is incompatible with string [2]. [incompatible-type]",
      "Cannot assign `true` to `bar` because boolean [1] is incompatible with number [2]. [incompatible-type]",
      "Cannot assign `'foo'` to `baz` because string [1] is incompatible with boolean [2]. [incompatible-type]",
    ]);
  });

  it("simple-types-pass", () => {
    const diagnostics = convertAndGetDiagnostics("simple-types-pass");

    expect(diagnostics).toEqual([]);
    expect(flowResults["simple-types-pass.js"]).toEqual(undefined);
  });
});
