const convert = require("../src/convert.js");

const runTestCases = (testCases, formatter) => {
  for (const [flowCode, tsCode] of testCases) {
    test(`${flowCode} -> ${tsCode}`, () => {
      if (formatter) {
        expect(formatter(convert(flowCode))).toEqual(tsCode);
      } else {
        expect(convert(flowCode)).toEqual(tsCode);
      }
    });
  }
};

// babel's codegen outputs object types on multiple lines, this
// formatter puts everything back on the same line.
const formatter = (code) => {
  return code.split("\n").map(line => line.trim()).join("");
};

describe("basic type annotations", () => {
  const testCases = [
    ["let a: string;", "let a: string;"],
    ["let a: number;", "let a: number;"],
    ["let a: boolean;", "let a: boolean;"],
    ["let a: null;", "let a: null;"],
    ["let a: any;", "let a: any;"],
    ["let a: void;", "let a: void;"],
    ["let a: mixed;", "let a: unknown;"],
    ["let a: empty;", "let a: never;"],
  ];

  runTestCases(testCases);
});

describe("flow comments", () => {
  const testCases = [
    ["// @flow\nlet a: string;", "let a: string;"],
    ["// $FlowFixMe\nlet a: string;", "let a: string;"],
    ["// $FlowFixMe: TODO\nlet a: string;", "let a: string;"],
  ];

  runTestCases(testCases);
});

describe("type aliases", () => {
  const testCases = [
    ["type T = string;", "type T = string;"],
    ["type T<A> = {a: A;};", "type T<A> = {a: A;};"],
  ];

  runTestCases(testCases, formatter);
});

describe("function types", () => {
  const testCases = [
    ["let a: () => void;", "let a: () => void;"],
    ["let a: (b: string) => void;", "let a: (b: string) => void;"],
    ["let a: (b?: string) => void;", "let a: (b?: string) => void;"],
    ["let a: <T>(b: T) => void;", "let a: <T>(b: T) => void;"],
    ["let a: (string) => void;", "let a: (arg0: string) => void;"],
    ["let a: (string, number) => void;", "let a: (arg0: string, arg1: number) => void;"],
    ["let a: (b: string, ...rest: number[]) => void;", "let a: (b: string, ...rest: number[]) => void;"],
  ];

  runTestCases(testCases);
});

describe("arrays and tuples", () => {
  const testCases = [
    ["let a: string[];", "let a: string[];"],
    ["let a: Array<string>;", "let a: Array<string>;"],
    ["let a: [string, number];", "let a: [string, number];"]
  ];

  runTestCases(testCases);
});

describe("nullable", () => {
  const testCases = [
    ["let a: ?string;", "let a: string | null;"],
    ["let a: ?Array<string>;", "let a: Array<string> | null;"],
    ["let a: Array<?string>;", "let a: Array<string | null>;"],
    ["let a: ?Array<?string>;", "let a: Array<string | null> | null;"],
  ];

  runTestCases(testCases);
});

describe("objects", () => {
  const testCases = [
    [`let obj: {a: string};`, `let obj: {a: string;};`],
    [`let obj: {+a: string};`, `let obj: {readonly a: string;};`],
    [`let obj: {-a: string};`, `let obj: {a: string;};`],  // TODO: test that we warn
    [`let obj: {[key: number]: string};`, `let obj: {[key: number]: string;};`],
    [`let obj: {+[key: number]: string};`, `let obj: {readonly [key: number]: string;};`],
    [`let obj: {a(): string};`, `let obj: {a(): string;};`],
    [`let obj: {a<T>(b: T): string};`, `let obj: {a<T>(b: T): string;};`],
    [`let obj: {|a: string|};`, `let obj: {a: string;};`],  // TODO: test that we warn
    // TODO: getter, setter properties
    // TODO: test the order of indexer and non-indexer entries
  ];

  runTestCases(testCases, formatter);
});

describe("interaction, union, and spread", () => {
  const testCases = [
    [`let obj: T & U;`, `let obj: T & U;`],
    [`let obj: T | U;`, `let obj: T | U;`],
    [`let obj: {...T, ...U};`, `let obj: T & U;`],
    [`let obj: {...T, x: number};`, `let obj: T & {x: number;};`],
    // [`let obj: {x: number, ...T, y: number};`, `let obj: {x: number;} & T & {y: number;};`],
    // [`let obj: {x: number, ...T};`, `let obj: {x: number;} & T;`],
  ];

  runTestCases(testCases, formatter);
});

describe("utility types", () => {
  const testCases = [
    ["let a: $ReadOnly<string>;", "let a: Readonly<string>;"],
    ["let a: $ReadOnlyArray<string>;", "let a: ReadonlyArray<string>;"],
    // TODO:
    // SyntheticMouseEvent -> React.MouseEvent
    // React.Node -> React.ReactNode
    // React$Element -> React.Element
    // etc.
  ];

  runTestCases(testCases);
});

describe("type casting", () => {
  const testCases = [
    ["const a: number = (5: any);", "const a: number = (5: any);"],
    ["const a = ((5: any): number);", "const a = ((5: any): number);"],
  ];

  runTestCases(testCases);
});
