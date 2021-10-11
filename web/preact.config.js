const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

export default function (config, env, helpers) {
  config.resolve.plugins.push(new TsconfigPathsPlugin());
}
