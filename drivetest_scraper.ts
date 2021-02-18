import { launch, Page } from 'puppeteer';
import { RateLimit } from 'async-sema';

const config = require('./config.json');

async function login(page: Page) {
  const EMAIL_SELECTOR = '#emailAddress';
  const CONFIRM_EMAIL_SELECTOR = '#confirmEmailAddress';
  const LICENSE_NUMBER_SELECTOR = '#licenceNumber';
  const LICENSE_EXPIRY_SELECTOR = '#licenceExpiryDate';
  const SUBMIT_BTN_SELECTOR = '#regSubmitBtn';

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
  const LICENSE_BTN_SELECTOR = '#lic_' + config.licenseType;
  const CONTINUE_BTN_SELECTOR = '#booking-licence > div > form > div > div.directive_wrapper.ng-isolate-scope > button';

  await page.waitForSelector(LICENSE_BTN_SELECTOR);
  await page.click(LICENSE_BTN_SELECTOR);
  await page.click(CONTINUE_BTN_SELECTOR);

  const response = await page.waitForResponse('https://drivetest.ca/booking/v1/eligibilityCheck');
  if (response.status() === 412) {
    const EDIT_BOOKING_SELECTOR = '#booking-licence > div > form > div > a';
    const RESCHEDULE_BOOKING_SELECTOR = '.appointment_wrapper > div > div > div.appointment_summary_cols.col-xs-12.col-sm-10 > div > span:nth-child(12) > button';
    const MODAL_RESCHEDULE_BOOKING_SELECTOR = '#page_book_a_road_test_booking > div.modal.fade.ng-isolate-scope.rescheduleModal.in > div > div > div > div > div > div.form-group.lic-submit > button.btn.btn-primary';

    await page.waitForSelector(EDIT_BOOKING_SELECTOR);
    await page.click(EDIT_BOOKING_SELECTOR);
    await page.waitForSelector(RESCHEDULE_BOOKING_SELECTOR);
    await page.click(RESCHEDULE_BOOKING_SELECTOR);

    await page.waitForSelector(MODAL_RESCHEDULE_BOOKING_SELECTOR);
    await page.evaluate((modalRescheduleBookingSelector) => {
      return new Promise(resolve => {
        const intervalId = setInterval(() => {
          if ((document.querySelector(modalRescheduleBookingSelector) as HTMLElement).innerText === 'RESCHEDULE') {
            clearInterval(intervalId);
            resolve(undefined);
          }
        }, 200);
      });
    }, MODAL_RESCHEDULE_BOOKING_SELECTOR);
    await page.click(MODAL_RESCHEDULE_BOOKING_SELECTOR);
  }
}

async function findAvailabilities(searchRadius: number) {

}

(async () => {
  const browser = await launch({
    headless: false
  });
  const page = await browser.newPage();
  await page.goto('https://drivetest.ca/book-a-road-test/booking.html');

  await login(page);
  await selectLicenseType(page);
})().catch(err => console.error(err));
