import { ScraperOptions } from "~utils/scraperOptions";

import { OptionsStore, optionsStore } from "./options.store";

export class OptionsService {
  constructor(private optionsStore: OptionsStore) {}

  setOptions(options: ScraperOptions) {
    this.optionsStore.update(options);
  }
}

export const optionsService = new OptionsService(optionsStore);
