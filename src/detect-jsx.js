const { parse } = require("@babel/parser");
const traverse = require("../babel-traverse/lib/index.js").default;

const { parseOptions } = require("./convert.js");

const detectJsx = (code) => {
  let jsx = false;
  const ast = parse(code, parseOptions);

  traverse(ast, {
    JSXOpeningElement({ node }) {
      jsx = true;
    },
  });

  return jsx;
};

module.exports = detectJsx;
