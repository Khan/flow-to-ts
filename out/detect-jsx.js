"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectJsx = void 0;
const parser_1 = require("@babel/parser");
const index_js_1 = __importDefault(require("../babel-traverse/lib/index.js"));
const convert_js_1 = require("./convert.js");
const detectJsx = (code) => {
    let jsx = false;
    const ast = parser_1.parse(code, convert_js_1.parseOptions);
    index_js_1.default(ast, {
        JSXOpeningElement({ node }) {
            jsx = true;
        },
    });
    return jsx;
};
exports.detectJsx = detectJsx;
