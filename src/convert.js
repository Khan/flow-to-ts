const { parse } = require("@babel/parser");
const traverse = require("../babel-traverse/lib/index.js").default;
const generate = require("../babel-generator/lib/index.js").default;
const prettier = require("prettier/standalone.js");
const plugins = [require("prettier/parser-typescript.js")];

const transform = require("./transform.js");

const parseOptions = {
  sourceType: "module",
  plugins: [
    // enable jsx and flow syntax
    "jsx",
    "flow",

    // handle esnext syntax
    "classProperties",
    "objectRestSpread",
    "dynamicImport"
  ]
};

const convert = (flowCode, options) => {
  const ast = parse(flowCode, parseOptions);

  const comments = {
    startLine: {},
    endLine: {}
  };
  for (const comment of ast.comments) {
    comments.startLine[comment.loc.start.line] = comment;
    comments.endLine[comment.loc.end.line] = comment;
  }

  // apply our transforms, traverse mutates the ast
  const state = {
    usedUtilityTypes: new Set(),
    options: Object.assign({ inlineUtilityTypes: false }, options),
    comments
  };
  traverse(ast, transform, null, state);

  if (options && options.debug) {
    console.log(JSON.stringify(ast, null, 4));
  }

  // we pass flowCode so that generate can compute source maps
  // if we ever decide to
  let tsCode = generate(ast, flowCode).code;
  for (let i = 0; i < state.trailingLines; i++) {
    tsCode += "\n";
  }

  if (options && options.prettier) {
    const prettierOptions = {
      parser: "typescript",
      plugins,
      semi: options.semi,
      singleQuote: options.singleQuote,
      tabWidth: options.tabWidth,
      trailingComma: options.trailingComma,
      bracketSpacing: options.bracketSpacing,
      arrowParens: options.arrowParens,
      printWidth: options.printWidth
    };
    return prettier.format(tsCode, prettierOptions).trim();
  } else {
    return tsCode;
  }
};

module.exports = convert;
