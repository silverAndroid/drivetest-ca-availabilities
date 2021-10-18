import { LicenseClass } from "../api/interfaces";
import { Coordinates } from "./distanceTo";

export interface ScraperOptions {
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  licenseType: LicenseClass;
  radius: number;
  location: Coordinates;
  months: number;
  chromiumPath: string;
  enableContinuousSearching: boolean;
}

export const LICENSE_NUMBER_FORMAT = /[A-Z][0-9]{4}-[0-9]{5}-[0-9]{5}/;
export const LICENSE_EXPIRY_FORMAT =
  /^\d{4}\/(0?[1-9]|1[012])\/(0?[1-9]|[12][0-9]|3[01])$/;

export const DEFAULT_RADIUS = 20;
export const DEFAULT_NUM_MONTHS = 6;
