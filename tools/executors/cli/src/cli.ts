import os from "os";

import { Executor } from "@nrwl/devkit";

import { logger } from "~drivetest-ca-availabilities/logger";

import { CliOptions, main } from "./main";

const cliExecutor: Executor = async (options: CliOptions) => {
  try {
    logger.info(os.arch());
    if (os.arch() === "arm64") {
      logger.warn(
        "Chromium doesn't have any arm64 binaries so --chromiumPath is a required option",
      );
      if (!options.chromiumPath) {
        return { success: false };
      }
    }

    await main(options);
    return { success: true };
  } catch (error) {
    logger.error(error);
    return { success: false };
  }
};
export default cliExecutor;
