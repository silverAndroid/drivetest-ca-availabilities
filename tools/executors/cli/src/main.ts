import dayjs from "dayjs";
import fetch from "node-fetch";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteerType from "puppeteer-extra/dist/puppeteer";
import semver from "semver";

import { logger } from "~drivetest-ca-availabilities/logger";
import {
  listenForResponses,
  ELIGIBILITY_CHECK_ID,
  BOOKING_DATES_ID,
  BOOKING_TIMES_ID,
  LOCATIONS_ID,
  login,
  selectLicenseType,
  findAvailabilities,
  waitToEnterBookingPage,
  getDriveTestCenters,
  Result,
  sleep,
  ScraperOptions,
} from "~drivetest-ca-availabilities/scraper";

function getVersion() {
  return (
    process.env.npm_package_version ||
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("../../../../package.json").version
  );
}

async function checkCliUpdate() {
  const res = await fetch(
    "https://github.com/silverAndroid/drivetest-ca-availabilities/releases/latest",
  );
  const currentVersion = getVersion();
  const newVersion = res.url.split("/").slice(-1)[0];

  if (semver.lt(currentVersion, newVersion)) {
    return {
      url: res.url,
      isMajorUpdate: semver.diff(currentVersion, newVersion) === "major",
    };
  }

  return null;
}

export async function main(options: ScraperOptions): Promise<void> {
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
    logger.info("No new updates found, current version %s", getVersion());
  }

  const {
    email,
    licenseNumber,
    licenseExpiry,
    licenseType,
    radius,
    location,
    months,
    chromiumPath,
    enableContinuousSearching,
  } = options;

  let browser: puppeteerType.Browser | undefined;
  let shouldCloseBrowserWhenDone = true;
  try {
    puppeteer.use(StealthPlugin());
    browser = await puppeteer.launch({
      headless: false,
      executablePath: chromiumPath,
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
      } else if (url === "https://drivetest.ca/booking/v1/location") {
        return LOCATIONS_ID;
      }

      return null;
    });

    await page.goto("https://drivetest.ca/book-a-road-test/booking.html");

    await waitToEnterBookingPage(page);
    logger.info("Logging in...");
    await login(page, email, licenseNumber, licenseExpiry);
    logger.info("Finding available times for a %s exam", licenseType);
    await selectLicenseType(page, licenseType);

    const availableCenters = await getDriveTestCenters(
      page,
      radius,
      location,
      licenseType,
    );
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

    const foundResults: {
      type: Result.FOUND;
      name: string;
      time: Date;
    }[] = [];

    do {
      for await (const result of findAvailabilities(
        page,
        availableCenters,
        months,
      )) {
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
