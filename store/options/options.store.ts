import { Store, StoreConfig } from "@datorama/akita";

import { ScraperOptions } from "~utils/scraperOptions";

export interface OptionsState extends Partial<ScraperOptions> {}

export type FilterOptionsState<T extends keyof ScraperOptions> = Pick<
  ScraperOptions,
  T
>;

export function createInitialState(): OptionsState {
  return {};
}

@StoreConfig({ name: "options" })
export class OptionsStore extends Store<OptionsState> {
  constructor() {
    super(createInitialState());
  }
}

export const optionsStore = new OptionsStore();
