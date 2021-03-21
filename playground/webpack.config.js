const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const {flowConfig, tsConfig, tsxConfig} = require("./babel.configs.js");

module.exports = {
  mode: "development",
  target: "web",
  entry: {
    index: "./src/index.tsx"
  },
  output: {
    publicPath: "/",
    filename: "[name].bundle.js",
    chunkFilename: "[name].bundle.js",
    path: path.resolve(__dirname, "dist")
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
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
      {
        test: /\.tsx$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: tsxConfig,
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      },
      {
        test: /.png$/,
        use: ["file-loader"]
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"],
    fallback: {
      fs: false,
      constants: false,
    },
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./templates/index.html"
    }),
    new webpack.DefinePlugin({
      "process.platform": JSON.stringify("web"),
      "process.env": {
        NODE_ENV: JSON.stringify("development"),
      },
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  node: {
    global: true,
  },
};
