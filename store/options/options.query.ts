import { Query } from "@datorama/akita";
import { OptionsStore, OptionsState, optionsStore } from "./options.store";

export class OptionsQuery extends Query<OptionsState> {
  options$ = this.select();

  public get chromiumPath() {
    return this.getValue().chromiumPath;
  }

  public get licenseType() {
    return this.getValue().licenseType!;
  }

  public get months() {
    return this.getValue().months!;
  }

  loginDetails$ = this.select(["email", "licenseNumber", "licenseExpiry"]);

  searchParameters$ = this.select(["licenseType", "radius", "location"]);

  constructor(protected store: OptionsStore) {
    super(store);
  }
}

export const optionsQuery = new OptionsQuery(optionsStore);
