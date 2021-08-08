import { Command } from "commander";
import os from 'os';
import * as path from "path";
import { BrowserFetcher } from "puppeteer/lib/cjs/puppeteer/node/BrowserFetcher";

import { CliOptions, main } from "./main";
import { logger } from "./logger";
import {
  parseCommanderInt,
  parseLocation,
  verifyDateFormat,
  verifyLicenseNumber,
} from "./utils";

const program = new Command();

setupCliInterface()
  .then(async (options) => {
    if (options.chromiumPath) {
      return options;
    }

    return {
      ...options,
      chromiumPath: await downloadChrome()
    };
  })
  .then((options) => main(options))
  .catch((err: Error) => {
    if (err.stack) {
      logger.error(err.stack);
    } else {
      logger.error(err.message);
    }

    process.exit(1);
  });

async function downloadChrome() {
  function toMegabytes(bytes: number) {
    const mb = bytes / 1024 / 1024;
    return `${Math.round(mb * 10) / 10} Mb`;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ProgressBar = require("progress");
  let progressBar: typeof ProgressBar;

  const dirName = process.cwd();
  const projectRoot = dirName.includes("dist")
    ? path.join(dirName, "../../../")
    : dirName;
  const browserFetcher = new BrowserFetcher(projectRoot);
  let lastDownloadedBytes = 0;
  const revisionInfo = await browserFetcher.download(
    // revision number taken from https://github.com/puppeteer/puppeteer/blob/v8.0.0/src/revisions.ts#L23
    "856583",
    (downloaded, total) => {
      if (!progressBar) {
        progressBar = new ProgressBar(
          `Downloading compatible version of Chrome - ${toMegabytes(
            total
          )} [:bar] :percent :etas `,
          {
            complete: "=",
            incomplete: " ",
            width: 20,
            total,
          }
        );
      }

      const delta = downloaded - lastDownloadedBytes;
      lastDownloadedBytes = downloaded;
      progressBar.tick(delta);
    }
  );

  return revisionInfo.executablePath;
}

async function setupCliInterface() {
  program
    .option(
      "-r, --radius <radius>",
      "search radius in kilometers from where you are",
      (val) => parseCommanderInt(val, "radius"),
      20
    )
    .requiredOption(
      "-l, --location <location>",
      'your current location expressed in "latitude,longitude" (eg. 43.6426445,-79.3871645).',
      parseLocation
    )
    .option(
      "-m, --months <months>",
      "Number of months to look ahead",
      (val) => parseCommanderInt(val, "months"),
      6
    )
    .requiredOption(
      "--licenseType <licenseType>",
      "License type exam to search for"
    )
    .requiredOption("--email <email>", "Email to log in with")
    .requiredOption(
      "--licenseNumber <licenseNumber>",
      "License number to log in with",
      verifyLicenseNumber
    )
    .requiredOption(
      "--licenseExpiry <licenseExpiry>",
      'License expiry date expressed in "YYYY/MM/DD" to log in with',
      verifyDateFormat
    );

  if (os.arch() === 'arm64') {
    logger.warn("Chromium doesn't have any arm64 binaries so --chromiumPath is a required option");
    program
      .requiredOption(
        "--chromiumPath <chromiumPath>",
        "Path to Chromium-based browser executable, make sure not to use the browser you regularly use (HCaptcha may flag it as a bot and prevent you from accessing the site normally). If option not used, Chromium will be downloaded to this folder."
      );
  } else {
    program
      .option(
        "--chromiumPath <chromiumPath>",
        "Path to Chromium-based browser executable, make sure not to use the browser you regularly use (HCaptcha may flag it as a bot and prevent you from accessing the site normally). If option not used, Chromium will be downloaded to this folder."
      );
  }

  program.parse();

  return program.opts() as CliOptions;
}
