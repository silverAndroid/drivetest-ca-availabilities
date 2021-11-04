import { RateLimit } from "async-sema";
import { Page, Response } from "puppeteer";
import { firstValueFrom } from "rxjs";

import { availabilitiesService } from "~store/availabilities";
import { optionsQuery } from "~store/options";
import { responsesQuery } from "~store/responses";
import {
  ELIGIBILITY_CHECK_ID,
  LOCATIONS_ID,
  BOOKING_DATES_ID,
  BOOKING_TIMES_ID,
} from "~store/responses/responseIds";
import { promisesConcat } from "~utils/promise";

import { distanceTo, isInLicenseRange, retryIfFail, Unit } from "../utils";
import {
  DriveTestCenterLocationsResponse,
  DriveTestCenterLocation,
  BookingDateResponse,
  Description,
  BookingTimeResponse,
  BookingDateError,
} from "./api/interfaces";
import { logger } from "./logger";

export async function waitToEnterBookingPage(page: Page) {
  logger.info("Please pass the HCaptcha to continue...");

  try {
    await retryIfFail(
      async function passCaptcha(page: Page) {
        await page.waitForNavigation({ waitUntil: ["domcontentloaded"] });

        const HEADER_ELEM_SELECTOR = "#headerBar";
        const REGISTRATION_PANEL_SELECTOR = "#booking-registration";

        const didCaptchaPass = await Promise.race([
          page.waitForSelector(HEADER_ELEM_SELECTOR).then(() => false),
          page.waitForSelector(REGISTRATION_PANEL_SELECTOR).then(() => true),
        ]);
        if (!didCaptchaPass) {
          throw new Error("Failed to pass HCaptcha");
        }
      },
      [page],
      { useAllArgs: true },
    );
  } catch (error) {
    logger.info(
      "It's possible using Chromium won't be enough (as HCaptcha has flagged it as a browser Puppeteer uses), you'll need to download a Chromium-based browser. If you're not sure what to use, here's a list of browsers: https://techrrival.com/best-chromium-based-browsers/#List_of_Best_Chromium_Based_Browsers",
    );
    logger.info(
      "Make sure not to use the browser you normally use because you run the risk of HCaptcha flagging the browser you surf with as a bot! Try running this again with the --chromiumPath option.",
    );
    logger.info(
      "If you're still failing the CAPTCHA test after installing a new browser, I find deleting the cookies for the site very helpful.",
    );
    throw error;
  }

  logger.info("Waiting to be allowed to leave waiting room...");
  await page.waitForSelector("#emailAddress");
}

export async function login(page: Page) {
  const EMAIL_SELECTOR = "#emailAddress";
  const CONFIRM_EMAIL_SELECTOR = "#confirmEmailAddress";
  const LICENSE_NUMBER_SELECTOR = "#licenceNumber";
  const LICENSE_EXPIRY_SELECTOR = "#licenceExpiryDate";
  const SUBMIT_BTN_SELECTOR = "#regSubmitBtn";

  const { email, licenseExpiry, licenseNumber } = await firstValueFrom(
    optionsQuery.loginDetails$,
  );

  await page.waitForSelector(EMAIL_SELECTOR);
  await page.click(EMAIL_SELECTOR);
  await page.keyboard.type(email);
  await page.click(CONFIRM_EMAIL_SELECTOR);
  await page.keyboard.type(email);
  await page.click(LICENSE_NUMBER_SELECTOR);
  await page.keyboard.type(licenseNumber);
  await page.click(LICENSE_EXPIRY_SELECTOR);
  await page.keyboard.type(licenseExpiry);

  await page.click(SUBMIT_BTN_SELECTOR);
  await retryIfFail(
    async function waitForLogin(page: Page) {
      const res = await page.waitForResponse(
        "https://drivetest.ca/booking/v1/driver/email",
      );
      if (!res.ok()) {
        const statusCode = res.status();
        if (statusCode >= 400 && statusCode < 500) {
          logger.error(
            "Failed to automatically log you in, please clear all cookies, refresh the page and log in manually. If you see the error again, you may need to wait a few hours before trying to log in again.",
          );
        } else if (statusCode >= 500) {
          logger.error(
            "Drivetest doesn't seem to be working right now, try again in a few minutes.",
          );
          process.exit(1);
        }
        throw new Error("Failed to log in automatically");
      }
    },
    [page],
    { useAllArgs: true },
  );
  await retryIfFail(
    async function waitForNavigation(page: Page) {
      await page.waitForNavigation();
    },
    [page],
    { useAllArgs: true },
  );
}

export async function selectLicenseType(page: Page) {
  const licenseType = optionsQuery.licenseType;

  const LICENSE_BTN_SELECTOR = "#lic_" + licenseType;
  const CONTINUE_BTN_SELECTOR =
    "#booking-licence > div > form > div > div.directive_wrapper.ng-isolate-scope > button";

  await page.waitForSelector(LICENSE_BTN_SELECTOR);
  await page.click(LICENSE_BTN_SELECTOR);
  await page.click(CONTINUE_BTN_SELECTOR);

  const response = await responsesQuery.waitForResponse(
    page,
    ELIGIBILITY_CHECK_ID,
    logger,
  );
  if (response.status() === 412) {
    logger.trace('Going through "editing existing booking" flow');
    const EDIT_BOOKING_SELECTOR = "#booking-licence > div > form > div > a";
    const RESCHEDULE_BOOKING_SELECTOR =
      ".appointment_wrapper > div > div > div.appointment_summary_cols.col-xs-12.col-sm-10 > div > span:nth-child(12) > button";
    const MODAL_RESCHEDULE_BOOKING_SELECTOR =
      ".form-group > button.btn.btn-primary";

    await page.waitForSelector(EDIT_BOOKING_SELECTOR, { visible: true });
    await page.click(EDIT_BOOKING_SELECTOR);
    await page.waitForSelector(RESCHEDULE_BOOKING_SELECTOR);
    await page.click(RESCHEDULE_BOOKING_SELECTOR);

    const { waitForRescheduleModal } = await import("./evaluate");
    await page.waitForSelector(MODAL_RESCHEDULE_BOOKING_SELECTOR);
    await page.evaluate(
      waitForRescheduleModal,
      MODAL_RESCHEDULE_BOOKING_SELECTOR,
    );
    await page.click(MODAL_RESCHEDULE_BOOKING_SELECTOR);
  }
}

export async function getDriveTestCenters(page: Page) {
  const {
    licenseType: selectedLicenseClass,
    location: currentLocation,
    radius: searchRadius,
  } = await firstValueFrom(optionsQuery.searchParameters$);

  const response = await responsesQuery.waitForResponse(
    page,
    LOCATIONS_ID,
    logger,
  );
  const { driveTestCentres } =
    (await response.json()) as DriveTestCenterLocationsResponse;
  logger.debug("Fetched drivetest locations");
  return driveTestCentres
    .map<DriveTestCenterLocation>(
      ({
        latitude,
        longitude,
        locationHours,
        isClosed,
        name,
        id,
        licenceTestTypes,
      }) => ({
        locationHours,
        isClosed,
        name,
        id,
        licenceTestTypes,
        distance: distanceTo(
          currentLocation,
          { latitude: Number(latitude), longitude: Number(longitude) },
          Unit.Kilometers,
        ),
      }),
    )
    .filter(({ name, distance, licenceTestTypes }) => {
      if (!licenceTestTypes) {
        logger.trace("%s license types undefined", name);
        return false;
      }

      if (
        !licenceTestTypes.some((licenseType) =>
          isInLicenseRange(licenseType, selectedLicenseClass),
        )
      ) {
        logger.trace(
          "%s does not have license type %s",
          name,
          selectedLicenseClass,
        );
        return false;
      }

      // if centre outside of search radius, remove from array
      if (distance > searchRadius) {
        logger.trace(
          "%s too far away; search radius: %d, distance: %d",
          name,
          searchRadius,
          distance,
        );
        return false;
      }

      return true;
    })
    .sort(
      ({ distance: distanceA }, { distance: distanceB }) =>
        distanceA - distanceB,
    );
}

const rateLimiter = RateLimit(15, { uniformDistribution: true });

async function findAvailableDates(
  page: Page,
  location: DriveTestCenterLocation,
) {
  let numMonths = optionsQuery.months;

  const LOCATION_SELECTOR = `a[id="${location.id}"]`;
  const LOCATION_CONTINUE_BTN_SELECTOR =
    "#booking-location > div > div > form > div.form-group.loc-submit > div.directive_wrapper.ng-isolate-scope > button";
  const NEXT_BTN_SELECTOR =
    "#driver-info > div.ng-scope > div.calendar.ng-scope > div.calendar-header > a.calendar-month-control.ion-chevron-right";

  async function clickLocation() {
    await page.waitForSelector(LOCATION_SELECTOR);
    await retryIfFail(
      async function selectLocation(
        locationSelector: string,
        locationContinueBtnSelector: string,
      ) {
        await rateLimiter();
        logger.debug("clicking %s", locationSelector);
        await page.click(locationSelector);
        logger.debug("clicking %s", locationContinueBtnSelector);
        await page.click(locationContinueBtnSelector);
      },
      [page, LOCATION_SELECTOR, LOCATION_CONTINUE_BTN_SELECTOR],
      { maxRetries: 100 },
    );
  }
  await clickLocation();

  do {
    let month = 0;
    logger.debug("waiting for response with dates for location");

    let bookingDateResponse: Response;
    try {
      bookingDateResponse = await responsesQuery.waitForResponse(
        page,
        BOOKING_DATES_ID,
        logger,
      );
      month =
        Number(
          new URLSearchParams(bookingDateResponse.url().split("?").pop()).get(
            "month",
          ),
        ) - 1;
    } catch (error) {
      await clickLocation();
      month = 0;
      logger.error(
        "Something happened trying to wait for the request after selecting a location. Trying again...",
      );
      continue;
    }

    const bookingDateJson =
      (await bookingDateResponse.json()) as BookingDateResponse;
    const { availableBookingDates, statusCode } = bookingDateJson;

    availabilitiesService.updateSearchingState(
      location.id,
      location.name,
      month,
    );

    if (statusCode > 0) {
      const { statusMessage } = bookingDateJson as unknown as BookingDateError;
      availabilitiesService.setError({
        code: statusCode,
        message: statusMessage,
      });
    }

    for (const { description, day } of availableBookingDates) {
      if (description === Description.Open) {
        const DATE_SELECTOR = `a[title="${day}"]`;
        const CALENDAR_CONTINUE_BTN_SELECTOR = "#calendarSubmit > button";

        const availableBookingTimes = await retryIfFail(
          async function selectDate(dateSelector, calendarContinueBtnSelector) {
            await rateLimiter();
            logger.debug("clicking %s", dateSelector);
            await page.click(dateSelector);
            logger.debug("clicking %s", calendarContinueBtnSelector);
            await page.click(calendarContinueBtnSelector);

            const bookingTimesResponse = await responsesQuery.waitForResponse(
              page,
              BOOKING_TIMES_ID,
              logger,
            );
            const { availableBookingTimes = [] } =
              (await bookingTimesResponse.json()) as BookingTimeResponse;
            return availableBookingTimes;
          },
          [page, DATE_SELECTOR, CALENDAR_CONTINUE_BTN_SELECTOR],
          { maxRetries: 100 },
        );
        for (const availability of availableBookingTimes) {
          availabilitiesService.addNewResult(new Date(availability.timeslot));
        }

        // need to wait 2 seconds for scrolling to finish
        await page.waitForTimeout(2000);
      }
    }

    if (numMonths > 0) {
      retryIfFail(
        async function clickNext(nextBtnSelector: string) {
          await rateLimiter();
          logger.debug("clicking %s", nextBtnSelector);
          await page.click(nextBtnSelector);
        },
        [page, NEXT_BTN_SELECTOR],
        { maxRetries: 100 },
      );
    }
  } while (numMonths-- > 0);
}

export async function findAvailabilities(
  page: Page,
  availableCenters: DriveTestCenterLocation[],
) {
  await promisesConcat(
    availableCenters.map(
      (driveCenter) => () => findAvailableDates(page, driveCenter),
    ),
  );

  availabilitiesService.setSearchComplete();
}
