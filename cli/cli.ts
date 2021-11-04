import { readFile, readFileSync } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

import { Command } from "commander";
import moduleAlias from "module-alias";

const {
  compilerOptions: { paths },
} = JSON.parse(
  readFileSync(path.join(process.cwd(), "tsconfig.json")).toString(),
);

const fullPaths = Object.keys(paths).filter((path) => !path.endsWith("/*"));
moduleAlias.addAliases(
  fullPaths.reduce<Record<string, string>>((pathsObj, key) => {
    pathsObj[key] = path.join(
      __dirname,
      "../",
      paths[key][0].replace(".ts", ".js"),
    );
    return pathsObj;
  }, {}),
);

const wildcardPaths = Object.keys(paths).filter((path) => path.endsWith("/*"));
for (const wildcardPath of wildcardPaths) {
  (moduleAlias as any).addAlias(
    wildcardPath.split("/").slice(0, -1).join("/"),
    (_fromPath: string, _request: string, alias: string) =>
      path.join(__dirname, "../", alias.replace("~", "")),
  );
}

import {
  parseCommanderInt,
  parseLocation,
  verifyLicenseNumber,
  verifyDateFormat,
} from "~utils";

import { ScraperOptions } from "~utils/scraperOptions";

import { logger } from "./logger";
import { main } from "./main";

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
