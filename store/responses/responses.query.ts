import { filterNilValue, Query } from "@datorama/akita";
import { Logger } from "pino";
import { Page, Response as HTTPResponse } from "puppeteer";
import { catchError, firstValueFrom, from, race, tap } from "rxjs";

import { ResponsesService, responsesService } from "./responses.service";
import {
  BOOKING_DATES_ID,
  BOOKING_TIMES_ID,
  ELIGIBILITY_CHECK_ID,
  LOCATIONS_ID,
} from "./responseIds";
import {
  ResponsesStore,
  ResponsesState,
  responsesStore,
  SavedResponseId,
} from "./responses.store";

export class ResponsesQuery extends Query<ResponsesState> {
  private readonly responsePredicates: Record<
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

  constructor(
    protected store: ResponsesStore,
    private responsesService: ResponsesService,
  ) {
    super(store);
  }

  getSavedResponse = (responseId: SavedResponseId) =>
    this.select(responseId).pipe(filterNilValue());

  async waitForResponse(
    page: Page,
    responseId: SavedResponseId,
    logger?: Logger,
  ) {
    const response = await firstValueFrom(
      race([
        this.getSavedResponse(responseId),
        from(
          page.waitForResponse(this.responsePredicates[responseId], {
            timeout: 5000,
          }),
        ).pipe(
          catchError(() => {
            logger?.trace("failed to wait for response %s", responseId);
            return this.getSavedResponse(responseId);
          }),
        ),
      ]).pipe(
        tap({ next: () => this.responsesService.resetResponse(responseId) }),
      ),
    );

    logger?.trace("received response %s", responseId);
    return response;
  }
}

export const responsesQuery = new ResponsesQuery(
  responsesStore,
  responsesService,
);
