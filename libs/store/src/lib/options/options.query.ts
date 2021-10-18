import { Query } from "@datorama/akita";

import { OptionsStore, OptionsState, optionsStore } from "./options.store";

export class OptionsQuery extends Query<OptionsState> {
  options$ = this.select();

  constructor(protected store: OptionsStore) {
    super(store);
  }
}

export const optionsQuery = new OptionsQuery(optionsStore);
