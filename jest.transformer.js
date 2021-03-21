const path = require("path");
const { transformSync } = require("@babel/core");

const { flowConfig, tsConfig } = require("./babel.configs.js");

module.exports = {
  process(src, filename, config, options) {
    if (path.extname(filename) === ".js") {
      return transformSync(src, {
        ...flowConfig,
        filename: filename,
      }).code;
    } else {
      return transformSync(src, {
        ...tsConfig,
        filename: filename,
      }).code;
    }
  },
};
