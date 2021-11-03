import { Command } from "commander";
import { readFile } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import { main } from "./main";
import { logger } from "./logger";
import {
  parseCommanderInt,
  parseLocation,
  verifyDateFormat,
  verifyLicenseNumber,
} from "./utils";
import { ScraperOptions } from "./utils/scraperOptions";

const readFileAsync = promisify(readFile);

const program = new Command();

setupCliInterface()
  .then((options) => main(options))
  .catch((err: Error) => {
    if (err.stack) {
      logger.error(err.stack);
    } else {
      logger.error(err.message);
    }

    process.exit(1);
  });

async function setupCliInterface() {
  let config;
  try {
    const configJSON = await readFileAsync(
      path.join(process.cwd(), "config.json"),
    );
    config = JSON.parse(configJSON.toString());
  } catch (error: any) {
    if (error.message.includes("no such file")) {
      throw new Error(
        "config.json not found in same directory as this program!",
      );
    }

    throw error;
  }

  program
    .option(
      "-r, --radius <radius>",
      "search radius in kilometers from where you are",
      (val) => parseCommanderInt(val, "radius"),
      20,
    )
    .requiredOption(
      "-l, --location <location>",
      'your current location expressed in "latitude,longitude" (eg. 43.6426445,-79.3871645).',
      parseLocation,
    )
    .option(
      "-m, --months <months>",
      "Number of months to look ahead",
      (val) => parseCommanderInt(val, "months"),
      6,
    )
    .option(
      "--licenseType <licenseType>",
      "License type exam to search for",
      config.licenseType,
    )
    .option("--email <email>", "Email to log in with", config.email)
    .option(
      "--licenseNumber <licenseNumber>",
      "License number to log in with",
      verifyLicenseNumber,
      config.licenseNumber,
    )
    .option(
      "--licenseExpiry <licenseExpiry>",
      'License expiry date expressed in "YYYY/MM/DD" to log in with',
      verifyDateFormat,
      config.licenseExpiry,
    )
    .option(
      "--enableContinuousSearching",
      "When added, the script will continue searching until the user's session is over",
    );

  if (os.arch() === "arm64") {
    logger.warn(
      "Chromium doesn't have any arm64 binaries so --chromiumPath is a required option",
    );
    program.requiredOption(
      "--chromiumPath <chromiumPath>",
      "Path to Chromium-based browser executable, make sure not to use the browser you regularly use (HCaptcha may flag it as a bot and prevent you from accessing the site normally). If option not used, Chromium will be downloaded to this folder.",
    );
  } else {
    program.option(
      "--chromiumPath <chromiumPath>",
      "Path to Chromium-based browser executable, make sure not to use the browser you regularly use (HCaptcha may flag it as a bot and prevent you from accessing the site normally). If option not used, Chromium will be downloaded to this folder.",
    );
  }

  program.parse();

  return program.opts() as ScraperOptions;
}
