import { Command, InvalidOptionArgumentError } from "commander";
import dayjs from "dayjs";
import { readFile } from "fs";
import fetch from "node-fetch";
import * as path from "path";
import puppeteer from "puppeteer";
import { BrowserFetcher } from "puppeteer/lib/cjs/puppeteer/node/BrowserFetcher";
import semver from "semver";
import { promisify } from "util";

import { logger } from "./logger";
import {
  BOOKING_DATES_ID,
  BOOKING_TIMES_ID,
  ELIGIBILITY_CHECK_ID,
  listenForResponses,
} from "./responseListener";
import { findAvailabilities, login, selectLicenseType } from "./scraper";
import { Coordinates, Result } from "./utils";

function parseCommanderInt(value: string, command: string, max?: number) {
  const number = Number(value);
  if (isNaN(number)) {
    throw new InvalidOptionArgumentError(`${command} is not a number!`);
  }
  return typeof max === "undefined" ? number : Math.min(number, max);
}

function verifyLicenseNumber(licenseNumber: string) {
  if (!/[A-Z][0-9]{4}-[0-9]{5}-[0-9]{5}/.test(licenseNumber)) {
    throw new InvalidOptionArgumentError(
      "license number must match format found here: https://www.services.gov.on.ca/wps85/wcm/connect/s2i/34491094-6a43-4d56-a152-317816e236a5/2/qvkgtrfx4296227867638271464.png?MOD=AJPERES&CVID="
    );
  }

  return licenseNumber;
}

function verifyDateFormat(date: string) {
  if (!/^\d{4}\/(0?[1-9]|1[012])\/(0?[1-9]|[12][0-9]|3[01])$/.test(date)) {
    throw new InvalidOptionArgumentError("date must follow format YYYY/MM/DD!");
  }
  return date;
}

function parseLocation(location: string): Coordinates {
  const coordinates = location
    .split(",")
    .map((coordinate) => Number(coordinate));
  if (coordinates.length < 2) {
    throw new InvalidOptionArgumentError(
      "location coordinates must follow format <latitude>,<longitude>!"
    );
  }

  return {
    latitude: coordinates[0],
    longitude: coordinates[1],
  };
}

type ProcessWithPkg = NodeJS.Process & { pkg: unknown | undefined };

let configPromise: Promise<Record<string, string>> | undefined;
if (!(process as ProcessWithPkg).pkg) {
  const readFileAsync = promisify(readFile);
  configPromise = readFileAsync("./config.json")
    .then((json) => JSON.parse(json.toString()))
    .catch((err) => {
      if (err.message.includes("no such file")) {
        throw new Error(
          "config.json not found in same directory as this program!"
        );
      }
      throw err;
    });
}

const program = new Command();

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
    );

  if (configPromise) {
    const config = await configPromise;
    program
      .option(
        "--licenseType <licenseType>",
        "License type exam to search for",
        config.licenseType
      )
      .option("--email <email>", "Email to log in with", config.email)
      .option(
        "--licenseNumber <licenseNumber>",
        "License number to log in with",
        verifyLicenseNumber,
        config.licenseNumber
      )
      .option(
        "--licenseExpiry <licenseExpiry>",
        'License expiry date expressed in "YYYY/MM/DD" to log in with',
        verifyDateFormat,
        config.licenseExpiry
      );
  } else {
    program
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
  }

  program.parse();
}

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

async function checkCliUpdate() {
  const res = await fetch(
    "https://github.com/silverAndroid/drivetest-ca-availabilities/releases/latest"
  );
  const { version: currentVersion } = require("./package.json");
  const newVersion = res.url.split("/").slice(-1)[0];

  if (semver.lt(currentVersion, newVersion)) {
    return res.url;
  }

  return null;
}

async function main() {
  logger.info("Checking for updates...");
  const updateUrl = await checkCliUpdate();
  if (updateUrl) {
    logger.info(
      "Found new update at %s! Please update to the latest version.",
      updateUrl
    );
    return;
  } else {
    logger.info(
      "No new updates found, current version %s",
      require("./package.json").version
    );
  }

  let executablePath: string | undefined = undefined;
  if (!configPromise) {
    executablePath = await downloadChrome();
  }

  const {
    email,
    licenseNumber,
    licenseExpiry,
    licenseType,
    radius,
    location,
    months,
  } = program.opts();

  let browser: puppeteer.Browser | undefined;
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath,
      defaultViewport: null as unknown as undefined,
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(0);
    page.setDefaultNavigationTimeout(0);

    listenForResponses(page, (req) => {
      const url = req.url();
      if (url === "https://drivetest.ca/booking/v1/eligibilityCheck") {
        return ELIGIBILITY_CHECK_ID;
      } else if (url.startsWith("https://drivetest.ca/booking/v1/booking/")) {
        return BOOKING_DATES_ID;
      } else if (url.startsWith("https://drivetest.ca/booking/v1/booking")) {
        return BOOKING_TIMES_ID;
      }

      return null;
    });

    await page.goto("https://drivetest.ca/book-a-road-test/booking.html");

    logger.info("Logging in...");
    await login(page, email, licenseNumber, licenseExpiry);
    logger.info("Finding available times for a %s exam", licenseType);
    await selectLicenseType(page, licenseType);

    for await (const result of findAvailabilities(
      page,
      radius,
      location,
      licenseType,
      months
    )) {
      if (result.type === Result.SEARCHING) {
        logger.info(
          "Searching %s at location %s",
          dayjs().month(result.month).format("MMMM"),
          result.name
        );
      } else if (result.type === Result.FAILED) {
        logger.error(
          "Couldn't search %s due to error %d:%s",
          result.name,
          result.error.code,
          result.error.message
        );
      } else {
        logger.info(
          "Found new time for location %s, %s",
          result.name,
          dayjs(result.time).format("MMMM DD, YYYY [at] hh:mm a")
        );
      }
    }
  } finally {
    browser?.close();
  }
}

setupCliInterface()
  .then(() => main())
  .catch((err: Error) => {
    if (err.stack) {
      logger.error(err.stack);
    } else {
      logger.error(err.message);
    }

    process.exit(1);
  });
