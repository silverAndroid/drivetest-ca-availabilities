import { Query } from "@datorama/akita";
import { filter } from "rxjs";

import {
  OptionsStore,
  OptionsState,
  optionsStore,
  FilterOptionsState,
} from "./options.store";

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

  loginDetails$ = this.select(["email", "licenseNumber", "licenseExpiry"]).pipe(
    filter(
      (
        loginDetails,
      ): loginDetails is FilterOptionsState<
        "email" | "licenseExpiry" | "licenseNumber"
      > => {
        const { email, licenseExpiry, licenseNumber } = loginDetails;
        return !!email && !!licenseExpiry && !!licenseNumber;
      },
    ),
  );

  searchParameters$ = this.select(["licenseType", "radius", "location"]).pipe(
    filter(
      (
        searchParams,
      ): searchParams is FilterOptionsState<
        "licenseType" | "radius" | "location"
      > => {
        const { licenseType, location, radius } = searchParams;
        return !!licenseType && !!location && !!radius;
      },
    ),
  );

  constructor(protected store: OptionsStore) {
    super(store);
  }
}

export const optionsQuery = new OptionsQuery(optionsStore);
