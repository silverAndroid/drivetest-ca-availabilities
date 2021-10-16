const { ProvidePlugin } = require("webpack");
const nrwlReactConfig = require("@nrwl/react/plugins/webpack");

module.exports = function (config) {
  const updatedConfig = nrwlReactConfig(config);
  updatedConfig.resolve.alias = {
    ...updatedConfig.resolve.alias,
    "react": "preact/compat",
    "react-dom/test-utils": "preact/test-utils",
    "react-dom": "preact/compat", // Must be below test-utils
    "react/jsx-runtime": "preact/jsx-runtime",
  };
  updatedConfig.plugins.push(
    new ProvidePlugin({
      h: ["preact", "h"],
    }),
  );

  return updatedConfig;
};
