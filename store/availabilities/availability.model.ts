import { ID } from "@datorama/akita";
import { Result } from "../../cli/utils/enums";

export interface AvailabilityError {
  code: number;
  message: string;
}

export interface Availability {
  locationId: ID;
  locationName: string;
  error?: AvailabilityError;
  times: Date[];
}

export type AvailableDateResultBase =
  | {
      type: Result.SEARCHING;
      month: number;
      name: string;
      times?: undefined;
    }
  | {
      type: Result.FAILED;
      name: string;
      error: {
        code: number;
        message: string;
      };
    };

export type FoundResult = {
  type: Result.FOUND;
  name: string;
  time: Date;
};

export type AvailabilityResult = AvailableDateResultBase | FoundResult;

export function createAvailability(
  params: Pick<Availability, "locationId" | "locationName"> &
    Partial<Omit<Availability, "locationId" | "locationName">>,
): Availability {
  return {
    locationId: params.locationId,
    locationName: params.locationName,
    times: params.times ?? [],
  };
}
