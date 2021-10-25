import dayjs from "dayjs";
import fetch from "node-fetch";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteerType from "puppeteer-extra/dist/puppeteer";
import semver from "semver";

import { optionsQuery, optionsService } from "../store/options";
import { responsesService } from "../store/responses";
import {
  BOOKING_DATES_ID,
  BOOKING_TIMES_ID,
  ELIGIBILITY_CHECK_ID,
  LOCATIONS_ID,
} from "../store/responses/responseIds";
import { logger } from "./logger";
import {
  login,
  selectLicenseType,
  findAvailabilities,
  waitToEnterBookingPage,
  getDriveTestCenters,
  FoundResult,
} from "./scraper";
import { Result } from "./utils";
import { ScraperOptions } from "./utils/scraperOptions";
import { sleep } from "./utils/sleep";

function getCliVersion(): string {
  return process.env.npm_package_version || require("../package.json").version;
}

async function checkCliUpdate() {
  const res = await fetch(
    "https://github.com/silverAndroid/drivetest-ca-availabilities/releases/latest",
  );
  const currentVersion = getCliVersion();
  const newVersion = res.url.split("/").slice(-1)[0];

  if (semver.lt(currentVersion, newVersion)) {
    return {
      url: res.url,
      isMajorUpdate: semver.diff(currentVersion, newVersion) === "major",
    };
  }

  return null;
}

export async function main(options: ScraperOptions) {
  logger.info("Checking for updates...");
  const update = await checkCliUpdate();
  if (update) {
    const { url: updateUrl, isMajorUpdate } = update;

    if (isMajorUpdate) {
      logger.info(
        "There's a new major version of this tool. Go to %s if you want to see what's changed!",
        "https://github.com/silverAndroid/drivetest-ca-availabilities/releases",
      );
      logger.info(
        "v2.0.0: There's now a GUI version in case using a CLI tool is unfamiliar to you!",
      );
      logger.warn(
        "There won't be any more updates unless you update to the new version!",
      );
      await sleep(3000);
    } else {
      logger.info(
        "Found new update at %s! Please update to the latest version.",
        updateUrl,
      );
      return;
    }
  } else {
    logger.info("No new updates found, current version %s", getCliVersion());
  }

  const { licenseType, enableContinuousSearching } = options;
  optionsService.setOptions(options);

  let browser: puppeteerType.Browser | undefined;
  let shouldCloseBrowserWhenDone = true;
  try {
    puppeteer.use(StealthPlugin());
    browser = await puppeteer.launch({
      headless: false,
      executablePath: optionsQuery.chromiumPath,
      defaultViewport: null as unknown as undefined,
    });
    const page = await browser.newPage();
    page.setDefaultTimeout(0);
    page.setDefaultNavigationTimeout(0);

    responsesService.listenForResponses(page, (req) => {
      const url = req.url();
      if (url === "https://drivetest.ca/booking/v1/eligibilityCheck") {
        return ELIGIBILITY_CHECK_ID;
      } else if (url.startsWith("https://drivetest.ca/booking/v1/booking/")) {
        return BOOKING_DATES_ID;
      } else if (url.startsWith("https://drivetest.ca/booking/v1/booking")) {
        return BOOKING_TIMES_ID;
      } else if (url === "https://drivetest.ca/booking/v1/location") {
        return LOCATIONS_ID;
      }

      return null;
    });

    await page.goto("https://drivetest.ca/book-a-road-test/booking.html");

    await waitToEnterBookingPage(page);
    logger.info("Logging in...");
    await login(page);
    logger.info("Finding available times for a %s exam", licenseType);
    await selectLicenseType(page);

    const availableCenters = await getDriveTestCenters(page);
    if (availableCenters.length === 0) {
      logger.error("No Drivetest centers that match your preferences");
      return;
    } else {
      logger.info(
        "Going to be searching these DriveTest centers: %s",
        availableCenters
          .map(({ name, distance }) => `${name} (${distance.toFixed(2)} km)`)
          .join(", "),
      );
    }

    const foundResults: FoundResult[] = [];

    do {
      for await (const result of findAvailabilities(page, availableCenters)) {
        if (result.type === Result.SEARCHING) {
          logger.info(
            "Searching %s at location %s",
            dayjs().month(result.month).format("MMMM"),
            result.name,
          );
        } else if (result.type === Result.FAILED) {
          logger.error(
            "Couldn't search %s due to error %d:%s",
            result.name,
            result.error.code,
            result.error.message,
          );
        } else {
          logger.info(
            "Found new time for location %s, %s",
            result.name,
            dayjs(result.time).format("MMMM DD, YYYY [at] hh:mm a"),
          );
          foundResults.push(result);
        }
      }

      if (foundResults.length === 0) {
        logger.error("No timeslots found");
        if (enableContinuousSearching) {
          logger.info("Continuous searching on, searching again");
        }
      } else {
        logger.info("Found %d available time slots:", foundResults.length);
        for (const result of foundResults) {
          logger.info(
            "• %s, %s",
            result.name,
            dayjs(result.time).format("MMMM DD, YYYY [at] hh:mm a"),
          );
        }

        if (enableContinuousSearching) {
          const inquirer = await import("inquirer");
          const { shouldContinue } = await inquirer.prompt([
            {
              type: "confirm",
              name: "shouldContinue",
              message: "Would you like to search for more time slots?",
            },
          ]);
          if (!shouldContinue) {
            shouldCloseBrowserWhenDone = false;
            break;
          }
        }
      }

      const pauseSeconds = 3;
      logger.info(
        "Pausing %d seconds to prevent overload of website",
        pauseSeconds,
      );
      await page.waitForTimeout(pauseSeconds * 1000);
    } while (enableContinuousSearching);
  } finally {
    if (shouldCloseBrowserWhenDone) {
      browser?.close();
    }
    logger.info(
      "If you appreciate my work, feel free to buy me a ☕️ (coffee) here 😊: https://www.buymeacoffee.com/rushilperera",
    );
  }
}
