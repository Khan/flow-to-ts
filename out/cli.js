"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cli = void 0;
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const glob_1 = __importDefault(require("glob"));
const prettier_1 = __importDefault(require("prettier"));
const convert_js_1 = require("./convert.js");
const detect_jsx_js_1 = require("./detect-jsx.js");
const package_json_1 = require("../package.json");
const cli = (argv) => {
    const program = new commander_1.Command();
    program
        .version(package_json_1.version)
        .option("--inline-utility-types", "inline utility types when possible, defaults to 'false'")
        .option("--prettier", "use prettier for formatting")
        .option("--semi", "add semi-colons, defaults to 'false' (depends on --prettier)")
        .option("--single-quote", "use single quotes instead of double quotes, defaults to 'false' (depends on --prettier)")
        .option("--tab-width [width]", "size of tabs (depends on --prettier)", /2|4/, 4)
        .option("--trailing-comma [all|es5|none]", "where to put trailing commas (depends on --prettier)", /all|es5|none/, "all")
        .option("--bracket-spacing", "put spaces between braces and contents, defaults to 'false' (depends on --prettier)")
        .option("--arrow-parens [avoid|always]", "arrow function param list parens (depends on --prettier)", /avoid|always/, "avoid")
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
        prettierOptions: {
            semi: Boolean(program.semi),
            singleQuote: Boolean(program.singleQuote),
            tabWidth: parseInt(program.tabWidth),
            trailingComma: program.trailingComma,
            bracketSpacing: Boolean(program.bracketSpacing),
            arrowParens: program.arrowParens,
            printWidth: parseInt(program.printWidth),
        },
    };
    if (options.prettier) {
        try {
            const prettierConfig = prettier_1.default.resolveConfig.sync(process.cwd());
            if (prettierConfig) {
                options.prettierOptions = prettierConfig;
            }
        }
        catch (e) {
            console.error("error parsing prettier config file");
            console.error(e);
            process.exit(1);
        }
    }
    const files = new Set();
    for (const arg of program.args) {
        for (const file of glob_1.default.sync(arg)) {
            files.add(file);
        }
    }
    for (const file of files) {
        const inFile = file;
        const inCode = fs_1.default.readFileSync(inFile, "utf-8");
        try {
            const outCode = convert_js_1.convert(inCode, options);
            if (program.write) {
                const extension = detect_jsx_js_1.detectJsx(inCode) ? ".tsx" : ".ts";
                const outFile = file.replace(/\.jsx?$/, extension);
                fs_1.default.writeFileSync(outFile, outCode);
            }
            else {
                console.log(outCode);
            }
            if (program.deleteSource) {
                fs_1.default.unlinkSync(inFile);
            }
        }
        catch (e) {
            console.error(`error processing ${inFile}`);
            console.error(e);
        }
    }
};
exports.cli = cli;
