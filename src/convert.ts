import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as prettier from "prettier/standalone.js";
const plugins = [require("prettier/parser-typescript.js")];

import { transform } from "./transform";
import type { ParserOptions } from "@babel/parser";

export const parseOptions: ParserOptions = {
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
    // decorators
    "decorators-legacy",
  ],
};

const fixComments = (commentsToNodesMap) => {
  for (const [key, value] of commentsToNodesMap) {
    const { leading, trailing } = value;

    if (leading && trailing) {
      trailing.trailingComments = trailing.trailingComments.filter(
        (comment) => {
          if (comment.type === "CommentLine") {
            try {
              if (comment.loc.start.line === trailing.loc.start.line) {
                // Leave this comment as is because it's at the end of a line,
                // e.g. console.log("hello, world"); // print 'hello, world'
                return true;
              }
            } catch (e) {
              console.log(trailing);
            }
          }
          const { start, end } = comment;
          return `${start}:${end}` !== key;
        }
      );
    }
  }
};

export const convert = (flowCode: string, options?: any) => {
  const ast = parse(flowCode, parseOptions);

  // key = startLine:endLine, value = {leading, trailing} (nodes)
  const commentsToNodesMap = new Map();

  const startLineToComments = {};
  for (const comment of ast.comments) {
    startLineToComments[comment.loc.start.line] = comment;
  }

  // apply our transforms, traverse mutates the ast
  const state = {
    usedUtilityTypes: new Set(),
    unqualifiedReactImports: new Set(),
    options: Object.assign({ inlineUtilityTypes: false }, options),
    commentsToNodesMap,
    startLineToComments,
  };
  traverse(ast, transform, null, state);

  fixComments(commentsToNodesMap);

  if (options && options.debug) {
    console.log(JSON.stringify(ast, null, 4));
  }

  // we pass flowCode so that generate can compute source maps
  // if we ever decide to
  let tsCode = generate(ast, undefined, flowCode).code;

  if (options && options.prettier) {
    const prettierOptions = {
      parser: "typescript",
      plugins,
      ...options.prettierOptions,
    };
    return prettier.format(tsCode, prettierOptions).trim();
  } else {
    return tsCode;
  }
};
