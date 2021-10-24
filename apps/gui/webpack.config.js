const path = require("path");

module.exports = function (config) {
  config.entry = {
    ...config.entry,
    preload: [path.join(__dirname, "src/preload.ts")],
  };
  config.output.filename = "[name].js";

  return config;
};
