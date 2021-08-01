import { Command } from "commander";
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
  .then(async (options) => ({ options, chromePath: await downloadChrome() }))
  .then(({ options, chromePath }) => main(options, chromePath))
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

  program.parse();

  return program.opts() as CliOptions;
}
