import { arrayAdd, ID } from "@datorama/akita";

import {
  AvailabilitiesStore,
  availabilitiesStore,
} from "./availabilities.store";
import { AvailabilityError } from "./availability.model";

export class AvailabilitiesService {
  constructor(private availabilitiesStore: AvailabilitiesStore) {}

  addNewResult(result: Date) {
    this.availabilitiesStore.updateActive(({ times }) => ({
      times: arrayAdd(times, result),
    }));
  }

  setError(error: AvailabilityError) {
    this.availabilitiesStore.updateActive({ error });
  }

  updateSearchingState(id: ID, name: string, month: number) {
    this.availabilitiesStore.upsert(id, { locationName: name });
    this.availabilitiesStore.setActive(id);
    this.availabilitiesStore.update({ month });
  }

  setSearchComplete() {
    this.availabilitiesStore.update({ isSearchComplete: true });
  }
}

export const availabilitiesService = new AvailabilitiesService(
  availabilitiesStore,
);
