import {
  Request as HTTPRequest,
  Response as HTTPResponse,
  Page,
} from "puppeteer";
import { logger } from "./logger";

export const BOOKING_DATES_ID = "booking_dates";
export const BOOKING_TIMES_ID = "booking_times";
export const ELIGIBILITY_CHECK_ID = "eligibility_check";
export const LOCATIONS_ID = 'locations';

type SavedResponseId =
  | typeof BOOKING_DATES_ID
  | typeof BOOKING_TIMES_ID
  | typeof ELIGIBILITY_CHECK_ID
  | typeof LOCATIONS_ID;

const responsePredicates: Record<
  SavedResponseId,
  string | ((res: HTTPResponse) => boolean)
> = {
  [BOOKING_DATES_ID]: (res) =>
    res.url().startsWith("https://drivetest.ca/booking/v1/booking/"),
  [BOOKING_TIMES_ID]: (res) =>
    res.url().startsWith("https://drivetest.ca/booking/v1/booking"),
  [ELIGIBILITY_CHECK_ID]: "https://drivetest.ca/booking/v1/eligibilityCheck",
  [LOCATIONS_ID]: "https://drivetest.ca/booking/v1/location",
};
const savedResponses: Partial<Record<SavedResponseId, Promise<HTTPResponse>>> =
  {};

export function listenForResponses(
  page: Page,
  shouldSaveResponse: (req: HTTPRequest) => SavedResponseId | null
) {
  page.on("request", (req: HTTPRequest) => {
    const savedId = shouldSaveResponse(req);
    if (savedId) {
      logger.debug("waiting for response %s", savedId);
      savedResponses[savedId] = new Promise(async (resolve) => {
        while (true) {
          const res = req.response();
          if (res) {
            logger.debug("received response %s", savedId);
            return resolve(res);
          }

          await page.waitForTimeout(200);
        }
      });
    }
  });
}

export async function waitForResponse(page: Page, responseId: SavedResponseId) {
  try {
    return await page.waitForResponse(responsePredicates[responseId], {
      timeout: 5000,
    });
  } catch (error) {
    const savedResponse = savedResponses[responseId];
    return savedResponse!;
  }
}
