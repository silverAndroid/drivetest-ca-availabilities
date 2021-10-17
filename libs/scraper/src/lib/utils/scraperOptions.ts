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
