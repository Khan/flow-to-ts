const fs = require("fs");
const {parse} = require("@babel/parser");
const traverse = require("../babel-traverse/lib/index.js").default;
const generate = require("../babel-generator/lib/index.js").default;
const prettier = require("prettier/standalone");
const plugins = [require("prettier/parser-typescript")];

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
    ],
};

const convert = (flowCode, options) => {
    const ast = parse(flowCode, parseOptions);

    // apply our transforms, traverse mutates the ast
    const state = {
        usedUtilityTypes: new Set(),
        options: Object.assign(
            { inlineUtilityTypes: false },
            options,
        ),
    };
    traverse(ast, transform, null, state);

    if (options && options.debug) {
        console.log(JSON.stringify(ast, null, 4));
    }

    // we pass flowCode so that generate can compute source maps
    // if we ever decide to
    const tsCode = generate(ast, {}, flowCode).code;
    
    const prettierOptions = Object.assign(
        { parser: "typescript", plugins }, 
        options && options.prettier,
    );
    return prettier.format(tsCode, prettierOptions).trim();
}

module.exports = convert;
