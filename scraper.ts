import { HTTPResponse, Page } from "puppeteer";
import fetch from "node-fetch";
import { RateLimit } from "async-sema";

import {
  Coordinates,
  distanceTo,
  isInLicenseRange,
  retryIfFail,
  Unit,
} from "./utils";
import {
  LicenseClass,
  DriveTestCenterLocationsResponse,
  DriveTestCenterLocation,
  BookingDateResponse,
  Description,
  BookingTimeResponse,
  BookingDateError,
} from "./api/interfaces";
import { Result } from "./utils/enums";
import { logger } from "./logger";

export async function login(
  page: Page,
  email: string,
  licenseNumber: string,
  licenseExpiry: string
) {
  const EMAIL_SELECTOR = "#emailAddress";
  const CONFIRM_EMAIL_SELECTOR = "#confirmEmailAddress";
  const LICENSE_NUMBER_SELECTOR = "#licenceNumber";
  const LICENSE_EXPIRY_SELECTOR = "#licenceExpiryDate";
  const SUBMIT_BTN_SELECTOR = "#regSubmitBtn";

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
        "https://drivetest.ca/booking/v1/driver/email"
      );
      if (!res.ok()) {
        logger.error(
          "Failed to automatically log you in, please clear all cookies, refresh the page and log in manually. If you see the error again, you may need to wait a few hours before trying to log in again"
        );
        throw new Error("Failed to log in automatically");
      }
    },
    [page],
    { useAllArgs: true }
  );
  await retryIfFail(
    async function waitForNavigation(page: Page) {
      await page.waitForNavigation();
    },
    [page],
    { useAllArgs: true }
  );
}

export async function selectLicenseType(page: Page, licenseType: LicenseClass) {
  const LICENSE_BTN_SELECTOR = "#lic_" + licenseType;
  const CONTINUE_BTN_SELECTOR =
    "#booking-licence > div > form > div > div.directive_wrapper.ng-isolate-scope > button";

  await page.waitForSelector(LICENSE_BTN_SELECTOR);
  await page.click(LICENSE_BTN_SELECTOR);
  await page.click(CONTINUE_BTN_SELECTOR);

  const response = await page.waitForResponse(
    "https://drivetest.ca/booking/v1/eligibilityCheck"
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
      MODAL_RESCHEDULE_BOOKING_SELECTOR
    );
    await page.click(MODAL_RESCHEDULE_BOOKING_SELECTOR);
  }
}

async function getDriveTestCenters(
  searchRadius: number,
  currentLocation: Coordinates,
  selectedLicenseClass: LicenseClass
) {
  const response = await fetch("https://drivetest.ca/booking/v1/location", {
    method: "GET",
  });
  const { driveTestCentres } =
    (await response.json()) as DriveTestCenterLocationsResponse;
  logger.debug('Fetched drivetest locations');
  return driveTestCentres
    .map<DriveTestCenterLocation>(
      ({
        latitude,
        longitude,
        locationHours,
        isClosed,
        name,
        id,
        licenceTestTypes: licenseTestTypes,
      }) => ({
        latitude: Number(latitude),
        longitude: Number(longitude),
        locationHours,
        isClosed,
        name,
        id,
        licenseTestTypes,
      })
    )
    .filter(({ latitude, longitude, licenseTestTypes }) => {
      if (
        !licenseTestTypes.some((licenseType) =>
          isInLicenseRange(licenseType, selectedLicenseClass)
        )
      ) {
        return false;
      }

      // if centre outside of search radius, remove from array
      if (
        distanceTo(currentLocation, { latitude, longitude }, Unit.Kilometers) >
        searchRadius
      ) {
        return false;
      }

      return true;
    });
}

const rateLimiter = RateLimit(15, { uniformDistribution: true });

async function* findAvailableDates(
  page: Page,
  location: DriveTestCenterLocation,
  numMonths: number
): AsyncGenerator<
  | {
      type: Result.SEARCHING;
      month: number;
      name: string;
      times?: undefined;
    }
  | {
      type: Result.FOUND;
      times: Date[];
      month?: undefined;
    }
  | {
      type: Result.FAILED;
      name: string;
      error: {
        code: number;
        message: string;
      };
    },
  Date[]
> {
  const LOCATION_SELECTOR = `a[id="${location.id}"]`;
  const LOCATION_CONTINUE_BTN_SELECTOR =
    "#booking-location > div > div > form > div.form-group.loc-submit > div.directive_wrapper.ng-isolate-scope > button";
  const NEXT_BTN_SELECTOR =
    "#driver-info > div.ng-scope > div.calendar.ng-scope > div.calendar-header > a.calendar-month-control.ion-chevron-right";

  await page.waitForSelector(LOCATION_SELECTOR);
  await retryIfFail(
    async function selectLocation(
      locationSelector: string,
      locationContinueBtnSelector: string
    ) {
      await rateLimiter();
      logger.debug("clicking %s", locationSelector);
      await page.click(locationSelector);
      logger.debug("clicking %s", locationContinueBtnSelector);
      await page.click(locationContinueBtnSelector);
    },
    [page, LOCATION_SELECTOR, LOCATION_CONTINUE_BTN_SELECTOR],
    { maxRetries: 100 }
  );

  let availableDates: Date[] = [];
  do {
    let month = 0;
    const bookingDateResponse = await page.waitForResponse(
      (res: HTTPResponse) => {
        const url = res.url();
        const isValidUrl = url.startsWith(
          `https://drivetest.ca/booking/v1/booking`
        );

        if (isValidUrl) {
          month = Number(new URLSearchParams(url).get("month")) - 1;
        }

        return isValidUrl;
      }
    );
    const bookingDateJson = (await bookingDateResponse.json()) as BookingDateResponse;
    const { availableBookingDates, statusCode } = bookingDateJson;

    if (statusCode > 0) {
      const {
        statusMessage,
      } = (bookingDateJson as unknown) as BookingDateError;
      yield {
        type: Result.FAILED,
        name: location.name,
        error: {
          code: statusCode,
          message: statusMessage,
        },
      };
      return [];
    }

    yield { type: Result.SEARCHING, name: location.name, month };

    for (const { description, day } of availableBookingDates) {
      if (description === Description.Open) {
        const DATE_SELECTOR = `a[title="${day}"]`;
        const CALENDAR_CONTINUE_BTN_SELECTOR = "#calendarSubmit > button";

        retryIfFail(
          async function selectDate(dateSelector, calendarContinueBtnSelector) {
            await rateLimiter();
            logger.debug("clicking %s", dateSelector);
            await page.click(dateSelector);
            logger.debug("clicking %s", calendarContinueBtnSelector);
            await page.click(calendarContinueBtnSelector);
          },
          [page, DATE_SELECTOR, CALENDAR_CONTINUE_BTN_SELECTOR],
          { maxRetries: 100 }
        );

        const bookingTimesResponse = await page.waitForResponse(
          (res: HTTPResponse) =>
            res.url().startsWith("https://drivetest.ca/booking/v1/booking")
        );
        const {
          availableBookingTimes = [],
        } = (await bookingTimesResponse.json()) as BookingTimeResponse;
        availableDates = [
          ...availableDates,
          ...availableBookingTimes.map(({ timeslot }) => new Date(timeslot)),
        ];

        yield {
          type: Result.FOUND,
          times: availableBookingTimes.map(
            ({ timeslot }) => new Date(timeslot)
          ),
        };

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
        { maxRetries: 100 }
      );
    }
  } while (numMonths-- > 0);

  return availableDates;
}

export async function* findAvailabilities(
  page: Page,
  searchRadius: number,
  currentLocation: Coordinates,
  selectedLicenseClass: LicenseClass,
  numMonths = 6
): AsyncGenerator<
  | {
      type: Result.SEARCHING;
      month: number;
      name: string;
    }
  | {
      type: Result.FOUND;
      name: string;
      time: Date;
    }
  | {
      type: Result.FAILED;
      name: string;
      error: {
        code: number;
        message: string;
      };
    },
  Record<string, { name: string; time: Date }[]>
> {
  const availableCenters = await getDriveTestCenters(
    searchRadius,
    currentLocation,
    selectedLicenseClass
  );

  const dates: Record<string, { name: string; time: Date }[]> = {};
  for (const driveCenter of availableCenters) {
    const availableDates = findAvailableDates(page, driveCenter, numMonths);
    for await (const result of availableDates) {
      if (result.type === Result.FOUND) {
        for (const availableDate of result.times) {
          const [date] = availableDate.toISOString().split("T");
          yield {
            type: Result.FOUND,
            name: driveCenter.name,
            time: availableDate,
          };
          dates[date] = [
            ...(dates[date] || []),
            {
              name: driveCenter.name,
              time: availableDate,
            },
          ];
        }
      } else {
        yield result;
      }
    }
  }

  return dates;
}
