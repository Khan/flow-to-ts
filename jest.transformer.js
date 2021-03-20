const path = require("path");
const { transformSync } = require("@babel/core");

const presetOptions = {
  targets: { node: 12 },
};

module.exports = {
  process(src, filename, config, options) {
    if (path.extname(filename) === ".js" && src.startsWith("// @flow")) {
      return transformSync(src, {
        babelrc: false,
        filename: filename,
        presets: [["@babel/preset-env", presetOptions]],
        plugins: [
          [
            "@babel/plugin-transform-flow-strip-types",
            { allowDeclareFields: true },
          ],
          "@babel/plugin-proposal-class-properties",
        ],
      }).code;
    } else {
      return transformSync(src, {
        babelrc: false,
        filename: filename,
        presets: [["@babel/preset-env", presetOptions]],
        plugins: [
          ["@babel/plugin-transform-typescript", { allowDeclareFields: true }],
          "@babel/plugin-proposal-class-properties",
        ],
      }).code;
    }
  },
};
