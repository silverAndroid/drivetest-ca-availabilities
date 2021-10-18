import { OptionsState, OptionsStore, optionsStore } from "./options.store";

export class OptionsService {
  constructor(private optionsStore: OptionsStore) {}

  setOptions(options: OptionsState): void {
    this.optionsStore.update(options);
  }
}

export const optionsService = new OptionsService(optionsStore);
