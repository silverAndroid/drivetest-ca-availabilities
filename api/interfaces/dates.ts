export interface BookingDateResponse {
  availableBookingDates: AvailableBookingDate[];
  valid: boolean;
  statusCode: number;
}

export interface AvailableBookingDate {
  day: number;
  density: number;
  description: Description;
}

export enum Description {
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
