const path = require("path");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

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
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
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
    extensions: [".ts", ".tsx", ".js", ".json"]
  },
  plugins: [
    new MonacoWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: "./templates/index.html"
    })
  ],
  devtool: "none"
};
