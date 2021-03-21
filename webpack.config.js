const path = require("path");

const {flowConfig, tsConfig} = require("./babel.configs.js");

module.exports = {
  target: "node",
  mode: "development",
  entry: {
    convert: "./src/convert.ts",
    cli: "./src/cli.ts",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].bundle.js",
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
