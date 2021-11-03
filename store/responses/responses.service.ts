import { Logger } from "pino";
import {
  Page,
  Request as HTTPRequest,
  Response as HTTPResponse,
} from "puppeteer";
import {
  ResponsesStore,
  responsesStore,
  SavedResponseId,
} from "./responses.store";

export class ResponsesService {
  constructor(private responsesStore: ResponsesStore) {}

  listenForResponses(
    page: Page,
    shouldSaveResponse: (req: HTTPRequest) => SavedResponseId | null,
    logger?: Logger,
  ) {
    page.on("request", (req: HTTPRequest | undefined) => {
      if (req) {
        const savedId = shouldSaveResponse(req);
        if (savedId) {
          logger?.debug("waiting for response %s %s", savedId, req.url());
          this.responsesStore.update({
            [savedId]: new Promise(async (resolve) => {
              while (true) {
                const res = req.response();
                if (res) {
                  logger?.debug("received response %s", savedId);
                  return resolve(res);
                }

                await page.waitForTimeout(200);
              }
            }),
          });
        }
      } else {
        logger?.warn("Received undefined request");
      }
    });
  }

  resetResponse(responseId: SavedResponseId, logger?: Logger) {
    this.responsesStore.update({ [responseId]: undefined });
    logger?.trace("reset response %s", responseId);
  }
}

export const responsesService = new ResponsesService(responsesStore);