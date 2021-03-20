const path = require("path");

const {flowConfig, tsConfig} = require("./babel.configs.js");

module.exports = {
  entry: "./src/convert.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "convert.js",
    library: {
      name: "flowToTs",
      type: "umd",
    },
    globalObject: "this",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: flowConfig,
        },
      },
      {
        test: /\.ts$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: tsConfig,
        },
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
};
