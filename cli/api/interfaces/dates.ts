export interface BookingDateResponse {
  availableBookingDates: AvailableBookingDate[];
  valid: boolean;
  statusCode: number;
}

export interface BookingDateError {
  valid: boolean;
  statusCode: number;
  statusMessage: string;
}

export interface AvailableBookingDate {
  day: number;
  density: number;
  description: Description;
}

export const enum Description {
  Full = "FULL",
  Open = "OPEN",
  Unavailable = "UNAVAILABLE",
}

export interface BookingTimeResponse {
  availableBookingTimes: AvailableBookingTime[];
  valid: boolean;
  statusCode: number;
}

export interface AvailableBookingTime {
  timeslot: string;
}
