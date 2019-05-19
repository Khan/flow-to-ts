const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

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
        exclude: [/node_modules/, /static/],
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
  node: {
    fs: "empty"
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".json"]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./templates/index.html"
    }),
    new CopyWebpackPlugin([{ from: "static", to: "static" }])
  ],
  devtool: "none"
};
