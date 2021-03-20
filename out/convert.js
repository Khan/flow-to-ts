"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convert = exports.parseOptions = void 0;
const parser_1 = require("@babel/parser");
const index_js_1 = __importDefault(require("../babel-traverse/lib/index.js"));
const generator_1 = __importDefault(require("@babel/generator"));
const prettier = __importStar(require("prettier/standalone.js"));
const plugins = [require("prettier/parser-typescript.js")];
const transform_js_1 = require("./transform.js");
exports.parseOptions = {
    sourceType: "module",
    plugins: [
        // enable jsx and flow syntax
        "jsx",
        "flow",
        // handle esnext syntax
        "classProperties",
        "objectRestSpread",
        "dynamicImport",
        "optionalChaining",
        "nullishCoalescingOperator",
        "classPrivateProperties",
        "classPrivateMethods",
    ],
};
const fixComments = (commentsToNodesMap) => {
    for (const [key, value] of commentsToNodesMap) {
        const { leading, trailing } = value;
        if (leading && trailing) {
            trailing.trailingComments = trailing.trailingComments.filter((comment) => {
                if (comment.type === "CommentLine") {
                    try {
                        if (comment.loc.start.line === trailing.loc.start.line) {
                            // Leave this comment as is because it's at the end of a line,
                            // e.g. console.log("hello, world"); // print 'hello, world'
                            return true;
                        }
                    }
                    catch (e) {
                        console.log(trailing);
                    }
                }
                const { start, end } = comment;
                return `${start}:${end}` !== key;
            });
        }
    }
};
const convert = (flowCode, options) => {
    const ast = parser_1.parse(flowCode, exports.parseOptions);
    // key = startLine:endLine, value = {leading, trailing} (nodes)
    const commentsToNodesMap = new Map();
    const startLineToComments = {};
    for (const comment of ast.comments) {
        startLineToComments[comment.loc.start.line] = comment;
    }
    // apply our transforms, traverse mutates the ast
    const state = {
        usedUtilityTypes: new Set(),
        options: Object.assign({ inlineUtilityTypes: false }, options),
        commentsToNodesMap,
        startLineToComments,
    };
    index_js_1.default(ast, transform_js_1.transform, null, state);
    fixComments(commentsToNodesMap);
    if (options && options.debug) {
        console.log(JSON.stringify(ast, null, 4));
    }
    // we pass flowCode so that generate can compute source maps
    // if we ever decide to
    let tsCode = generator_1.default(ast, flowCode).code;
    for (let i = 0; i < state.trailingLines; i++) {
        tsCode += "\n";
    }
    if (options && options.prettier) {
        const prettierOptions = {
            parser: "typescript",
            plugins,
            ...options.prettierOptions,
        };
        return prettier.format(tsCode, prettierOptions).trim();
    }
    else {
        return tsCode;
    }
};
exports.convert = convert;
