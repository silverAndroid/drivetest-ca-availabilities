import {
  distinctUntilArrayItemChanged,
  filterNilValue,
  QueryEntity,
} from "@datorama/akita";
import {
  combineLatest,
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  map,
  merge,
  takeUntil,
  withLatestFrom,
} from "rxjs";

import { Result } from "../../cli/utils/enums";
import {
  AvailabilitiesStore,
  AvailabilitiesState,
  availabilitiesStore,
} from "./availabilities.store";
import { AvailabilityResult } from "./availability.model";

export class AvailabilitiesQuery extends QueryEntity<AvailabilitiesState> {
  currentLocation$ = combineLatest([
    this.selectActive().pipe(
      filterNilValue(),
      map(({ locationId: id, locationName: name }) => ({ id, name })),
      distinctUntilKeyChanged("id"),
    ),
    this.select("month").pipe(filterNilValue(), distinctUntilChanged()),
  ]).pipe(map(([location, month]) => ({ location, month })));

  foundTimeSlots$ = this.selectActive().pipe(
    filterNilValue(),
    map(({ times }) => times),
    filter((times) => !!times),
    distinctUntilArrayItemChanged(),
    withLatestFrom(
      this.selectActive().pipe(
        filterNilValue(),
        map(({ locationName }) => locationName),
      ),
    ),
    map(([times, name]) => ({ name, times })),
  );

  searchCompleted$ = this.select("isSearchComplete");

  updates$ = merge(
    this.currentLocation$.pipe(
      map(
        ({ location, month }): AvailabilityResult => ({
          type: Result.SEARCHING,
          name: location.name,
          month,
        }),
      ),
    ),
    this.foundTimeSlots$.pipe(
      map(
        ({ name, times }): AvailabilityResult => ({
          type: Result.FOUND,
          time: times.slice(-1)[0],
          name,
        }),
      ),
    ),
  ).pipe(
    takeUntil(this.searchCompleted$.pipe(filter((isComplete) => isComplete))),
  );

  constructor(protected store: AvailabilitiesStore) {
    super(store);
  }
}

export const availabilitiesQuery = new AvailabilitiesQuery(availabilitiesStore);
