const presets = [
  ["@babel/preset-env", {targets: { node: 12 }}],
];

const commonPlugins = [
  "@babel/plugin-proposal-class-properties",
  ["module-resolver", {
    "alias": {
      "^@babel/(.+)": "./babel/packages/babel-\\1/src/index"
    }
  }],
];

exports.flowConfig = {
  babelrc: false,
  presets: presets,
  plugins: [
    [
      "@babel/plugin-transform-flow-strip-types",
      { allowDeclareFields: true },
    ],
    ...commonPlugins,
  ],
};

exports.tsConfig = {
  babelrc: false,
  presets: presets,
  plugins: [
    [
      "@babel/plugin-transform-typescript",
      { allowDeclareFields: true },
    ],
    ...commonPlugins,
  ],
};
