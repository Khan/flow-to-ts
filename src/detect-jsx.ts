import { parse } from "@babel/parser";
import traverse from "@babel/traverse";

import { parseOptions } from "./convert";

export const detectJsx = (code) => {
  let jsx = false;
  const ast = parse(code, parseOptions);

  traverse(ast, {
    JSXOpeningElement({ node }) {
      jsx = true;
    },
  });

  return jsx;
};
