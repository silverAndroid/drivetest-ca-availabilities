import { Store, StoreConfig } from "@datorama/akita";

import { PublicLicenseClass } from "~drivetest-ca-availabilities/scraper/api/interfaces";
import {
  DEFAULT_NUM_MONTHS,
  DEFAULT_RADIUS,
  ScraperOptions,
} from "~drivetest-ca-availabilities/scraper/utils/scraperOptions";

export type OptionsState = ScraperOptions;

export function createInitialState(): OptionsState {
  return {
    radius: DEFAULT_RADIUS,
    months: DEFAULT_NUM_MONTHS,
    enableContinuousSearching: false,
    chromiumPath: "",
    email: "",
    licenseExpiry: "",
    licenseNumber: "",
    licenseType: PublicLicenseClass.G2,
    location: { latitude: 0, longitude: 0 },
  };
}

@StoreConfig({ name: "options" })
export class OptionsStore extends Store<OptionsState> {
  constructor() {
    super(createInitialState());
  }
}

export const optionsStore = new OptionsStore();
