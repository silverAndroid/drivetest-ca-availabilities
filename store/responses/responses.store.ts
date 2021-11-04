import { Store, StoreConfig } from "@datorama/akita";
import { Response as HTTPResponse } from "puppeteer";

import {
  BOOKING_DATES_ID,
  BOOKING_TIMES_ID,
  ELIGIBILITY_CHECK_ID,
  LOCATIONS_ID,
} from "./responseIds";

export type SavedResponseId =
  | typeof BOOKING_DATES_ID
  | typeof BOOKING_TIMES_ID
  | typeof ELIGIBILITY_CHECK_ID
  | typeof LOCATIONS_ID;

export type ResponsesState = Partial<Record<SavedResponseId, HTTPResponse>>;

export function createInitialState(): ResponsesState {
  return {};
}

@StoreConfig({ name: "responses" })
export class ResponsesStore extends Store<ResponsesState> {
  constructor() {
    super(createInitialState());
  }
}

export const responsesStore = new ResponsesStore();
