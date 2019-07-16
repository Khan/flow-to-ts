const program = require("commander");
const fs = require("fs");
const glob = require("glob");

const convert = require("./convert.js");
const version = require("../package.json").version;

const cli = argv => {
  program
    .version(version)
    .option("--inline-utility-types", "inline utility types when possible")
    .option("--prettier", "use prettier for formatting")
    .option(
      "--semi",
      "add semi-colons, defaults to 'false' (depends on --prettier)"
    )
    .option(
      "--single-quote",
      "use single quotes instead of double quotes, defaults to 'false' (depends on --prettier)"
    )
    .option(
      "--tab-width [width]",
      "size of tabs (depends on --prettier)",
      /2|4/,
      4
    )
    .option(
      "--trailing-comma [all|es5|none]",
      "where to put trailing commas (depends on --prettier)",
      /all|es5|none/,
      "all"
    )
    .option(
      "--bracket-spacing",
      "put spaces between braces and contents (depends on --prettier)"
    )
    .option(
      "--arrow-parens [avoid|always]",
      "arrow function param list parens (depends on --prettier)",
      /avoid|always/,
      "avoid"
    )
    .option("--print-width [width]", "line width (depends on --prettier)", 80)
    .option("--write", "write output to disk instead of STDOUT")
    .option("--delete-source", "delete the source file");

  program.parse(argv);

  if (program.args.length === 0) {
    program.outputHelp();
    process.exit(1);
  }

  const options = {
    inlineUtilityTypes: Boolean(program.inlineUtilityTypes),
    prettier: program.prettier,
    semi: Boolean(program.semi),
    singleQuote: Boolean(program.singleQuote),
    tabWidth: parseInt(program.tabWidth),
    trailingComma: program.trailingComma,
    bracketSpacing: Boolean(program.bracketSpacing),
    arrowParens: program.arrowParens,
    printWidth: program.printWidth
  };

  const files = new Set();
  for (const arg of program.args) {
    for (const file of glob.sync(arg)) {
      files.add(file);
    }
  }

  for (const file of files) {
    const inFile = file;
    const inCode = fs.readFileSync(inFile, "utf-8");

    try {
      const outCode = convert(inCode, options);

      if (program.write) {
        const outFile = file.replace(/\.js$/, ".ts");
        fs.writeFileSync(outFile, outCode);
      } else {
        console.log(outCode);
      }

      if (program.deleteSource) {
        fs.unlinkSync(inFile);
      }
    } catch (e) {
      console.error(`error processing ${inFile}`);
      console.error(e);
    }
  }
};

module.exports = cli;
