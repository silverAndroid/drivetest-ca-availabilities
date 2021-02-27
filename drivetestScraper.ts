import { Browser, launch, Page } from "puppeteer";
import fetch from "node-fetch";

import { Coordinates, distanceTo, isInLicenseRange, Unit } from "./utils";
import {
  LicenseClass,
  DriveTestCenterLocationsResponse,
  DriveTestCenterLocation,
  BookingDateResponse,
  Description,
  BookingTimeResponse,
  PublicLicenseClass,
} from "./api/interfaces";

const config = require("./config.json");

async function login(page: Page) {
  const EMAIL_SELECTOR = "#emailAddress";
  const CONFIRM_EMAIL_SELECTOR = "#confirmEmailAddress";
  const LICENSE_NUMBER_SELECTOR = "#licenceNumber";
  const LICENSE_EXPIRY_SELECTOR = "#licenceExpiryDate";
  const SUBMIT_BTN_SELECTOR = "#regSubmitBtn";

  await page.waitForSelector(EMAIL_SELECTOR);
  await page.click(EMAIL_SELECTOR);
  await page.keyboard.type(config.email);
  await page.click(CONFIRM_EMAIL_SELECTOR);
  await page.keyboard.type(config.email);
  await page.click(LICENSE_NUMBER_SELECTOR);
  await page.keyboard.type(config.licenseNumber);
  await page.click(LICENSE_EXPIRY_SELECTOR);
  await page.keyboard.type(config.licenseExpiry);

  await page.click(SUBMIT_BTN_SELECTOR);
  await page.waitForNavigation();
}

async function selectLicenseType(page: Page) {
  const LICENSE_BTN_SELECTOR = "#lic_" + config.licenseType;
  const CONTINUE_BTN_SELECTOR =
    "#booking-licence > div > form > div > div.directive_wrapper.ng-isolate-scope > button";

  await page.waitForSelector(LICENSE_BTN_SELECTOR);
  await page.click(LICENSE_BTN_SELECTOR);
  await page.click(CONTINUE_BTN_SELECTOR);

  const response = await page.waitForResponse(
    "https://drivetest.ca/booking/v1/eligibilityCheck"
  );
  if (response.status() === 412) {
    const EDIT_BOOKING_SELECTOR = "#booking-licence > div > form > div > a";
    const RESCHEDULE_BOOKING_SELECTOR =
      ".appointment_wrapper > div > div > div.appointment_summary_cols.col-xs-12.col-sm-10 > div > span:nth-child(12) > button";
    const MODAL_RESCHEDULE_BOOKING_SELECTOR =
      "#page_book_a_road_test_booking > div.modal.fade.ng-isolate-scope.rescheduleModal.in > div > div > div > div > div > div.form-group.lic-submit > button.btn.btn-primary";

    await page.waitForSelector(EDIT_BOOKING_SELECTOR, { visible: true });
    await page.click(EDIT_BOOKING_SELECTOR);
    await page.waitForSelector(RESCHEDULE_BOOKING_SELECTOR);
    await page.click(RESCHEDULE_BOOKING_SELECTOR);

    await page.waitForSelector(MODAL_RESCHEDULE_BOOKING_SELECTOR);
    await page.evaluate((modalRescheduleBookingSelector) => {
      return new Promise((resolve) => {
        const intervalId = setInterval(() => {
          if (
            (document.querySelector(
              modalRescheduleBookingSelector
            ) as HTMLElement).innerText === "RESCHEDULE"
          ) {
            clearInterval(intervalId);
            resolve(undefined);
          }
        }, 200);
      });
    }, MODAL_RESCHEDULE_BOOKING_SELECTOR);
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
  const {
    driveTestCentres,
  } = (await response.json()) as DriveTestCenterLocationsResponse;
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

async function findAvailableDates(
  page: Page,
  location: DriveTestCenterLocation,
  numMonths: number
) {
  const LOCATION_SELECTOR = `a[id="${location.id}"]`;
  const LOCATION_CONTINUE_BTN_SELECTOR =
    "#booking-location > div > div > form > div.form-group.loc-submit > div.directive_wrapper.ng-isolate-scope > button";
  const NEXT_BTN_SELECTOR =
    "#driver-info > div.ng-scope > div.calendar.ng-scope > div.calendar-header > a.calendar-month-control.ion-chevron-right";

  await page.waitForSelector(LOCATION_SELECTOR);
  await page.click(LOCATION_SELECTOR);
  await page.click(LOCATION_CONTINUE_BTN_SELECTOR);

  let availableDates: Date[] = [];
  do {
    const bookingDateResponse = await page.waitForResponse((res) =>
      res.url().startsWith(`https://drivetest.ca/booking/v1/booking`)
    );
    const {
      availableBookingDates,
    } = (await bookingDateResponse.json()) as BookingDateResponse;

    for (const { description, day } of availableBookingDates) {
      if (description === Description.Open) {
        const DATE_SELECTOR = `a[title="${day}"]`;
        const CALENDAR_CONTINUE_BTN_SELECTOR = "#calendarSubmit > button";

        while (true) {
          try {
            await page.click(DATE_SELECTOR);
            await page.click(CALENDAR_CONTINUE_BTN_SELECTOR);
            break;
          } catch (error) {
            await page.waitForTimeout(1000);
          }
        }

        const bookingTimesResponse = await page.waitForResponse((res) =>
          res.url().startsWith("https://drivetest.ca/booking/v1/booking")
        );
        const {
          availableBookingTimes,
        } = (await bookingTimesResponse.json()) as BookingTimeResponse;
        availableDates = [
          ...availableDates,
          ...availableBookingTimes.map(({ timeslot }) => new Date(timeslot)),
        ];

        // need to wait 2 seconds for scrolling to finish
        await page.waitForTimeout(2000);
      }
    }

    await page.click(NEXT_BTN_SELECTOR);
  } while (numMonths-- > 0);

  return availableDates;
}

async function findAvailabilities(
  page: Page,
  searchRadius: number,
  currentLocation: Coordinates,
  selectedLicenseClass: LicenseClass,
  numMonths: number = 6
) {
  const availableCenters = await getDriveTestCenters(
    searchRadius,
    currentLocation,
    selectedLicenseClass
  );

  let dates: Record<string, string[]> = {};
  for (const driveCenter of availableCenters) {
    const availableDates = await findAvailableDates(
      page,
      driveCenter,
      numMonths
    );
    for (const availableDate of availableDates) {
      const [date] = availableDate.toISOString().split("T");
      dates[date] = [...(dates[date] || []), driveCenter.name];
    }
  }
  return dates;
}

export async function startSearching() {
  let browser: Browser | undefined;
  try {
    browser = await launch({
      headless: false,
    });
    const page = await browser.newPage();
    await page.goto("https://drivetest.ca/book-a-road-test/booking.html");

    await login(page);
    await selectLicenseType(page);
    const dates = await findAvailabilities(
      page,
    );
    console.log(dates);
  } catch (err) {
    console.error(err);
  } finally {
    browser?.close();
  }
}
