const path = require("path");
const tmp = require("tmp");
const fs = require("fs");
const mockConsole = require("jest-mock-console").default;
const mockProcess = require("jest-mock-process");

const cli = require("../src/cli.js");

// cleanup temp dir automatically in case of an exception
tmp.setGracefulCleanup();

describe("cli", () => {
  let tmpdir;
  let tmpobj;

  beforeEach(() => {
    tmpobj = tmp.dirSync();
    tmpdir = tmpobj.name;
  });

  afterEach(() => {
    // cleanup temp dir
    tmpobj.removeCallback();
  });

  it("should exit with code one when no files have been provided", () => {
    // Arrange
    mockConsole();
    const mockExit = mockProcess.mockProcessExit();

    // Act
    cli(["node", path.join(__dirname, "../flow-to-ts.js")]);

    // Assert
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  it("should console.log output", () => {
    // Arrange
    mockConsole();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");

    // Act
    cli(["node", path.join(__dirname, "../flow-to-ts.js"), inputPath]);

    // Assert
    expect(console.log).toHaveBeenCalledWith("const a: number = 5;");
  });

  it("should not write a file", () => {
    // Arrange
    mockConsole();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");

    // Act
    cli(["node", path.join(__dirname, "../flow-to-ts.js"), inputPath]);

    // Assert
    const outputPath = path.join(tmpdir, "test.ts");
    expect(fs.existsSync(outputPath)).toBe(false);
  });

  it("should log any files with errors", () => {
    // Arrange
    mockConsole();
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "?", "utf-8");

    // Act
    cli(["node", path.join(__dirname, "../flow-to-ts.js"), inputPath]);

    // Assert
    expect(console.log).toHaveBeenCalledWith(`error processing ${inputPath}`);
  });

  it("should write a file", () => {
    // Arrange
    const inputPath = path.join(tmpdir, "test.js");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      inputPath
    ]);

    // Assert
    expect(fs.existsSync(path.join(tmpdir, "test.ts"))).toBe(true);
  });

  it("should write many files with a glob", () => {
    // Arrange
    const inputGlob = path.join(tmpdir, "*.js");
    fs.writeFileSync(
      path.join(tmpdir, "foo.js"),
      "const a: number = 5;",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(tmpdir, "bar.js"),
      "const b: boolean = true;",
      "utf-8"
    );

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      inputGlob
    ]);

    // Assert
    expect(fs.existsSync(path.join(tmpdir, "foo.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tmpdir, "bar.ts"))).toBe(true);
  });

  it("should delete the original file", () => {
    // Arrange
    const inputPath = path.join(tmpdir, "test.js");
    const outputPath = path.join(tmpdir, "test.ts");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      "--delete-source",
      inputPath
    ]);

    // Assert
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.existsSync(inputPath)).toBe(false);
  });

  it("should delete many original files", () => {
    // Arrange
    const inputGlob = path.join(tmpdir, "*.js");
    fs.writeFileSync(
      path.join(tmpdir, "foo.js"),
      "const a: number = 5;",
      "utf-8"
    );
    fs.writeFileSync(
      path.join(tmpdir, "bar.js"),
      "const b: boolean = true;",
      "utf-8"
    );

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      "--delete-source",
      inputGlob
    ]);

    // Assert
    expect(fs.existsSync(path.join(tmpdir, "foo.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tmpdir, "bar.ts"))).toBe(true);
    expect(fs.existsSync(path.join(tmpdir, "foo.js"))).toBe(false);
    expect(fs.existsSync(path.join(tmpdir, "bar.js"))).toBe(false);
  });

  it("should write to the file", () => {
    // Arrange
    const inputPath = path.join(tmpdir, "test.js");
    const outputPath = path.join(tmpdir, "test.ts");
    fs.writeFileSync(inputPath, "const a: number = 5;", "utf-8");

    // Act
    cli([
      "node",
      path.join(__dirname, "../flow-to-ts.js"),
      "--write",
      inputPath
    ]);

    // Assert
    const output = fs.readFileSync(outputPath, "utf-8");
    expect(output).toBe("const a: number = 5;");
  });

  // TODO: add tests for option handling
});
