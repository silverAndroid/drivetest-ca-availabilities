import {
  ActiveState,
  EntityState,
  EntityStore,
  StoreConfig,
} from "@datorama/akita";

import { Availability } from "./availability.model";

export interface AvailabilitiesState
  extends EntityState<Availability>,
    ActiveState {
  month: number;
  isSearchComplete: boolean;
}

@StoreConfig({
  name: "availabilities",
  idKey: "locationId",
})
export class AvailabilitiesStore extends EntityStore<AvailabilitiesState> {
  constructor() {
    super();
  }
}

export const availabilitiesStore = new AvailabilitiesStore();
