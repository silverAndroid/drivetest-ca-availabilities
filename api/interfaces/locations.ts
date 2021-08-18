export interface DriveTestCenterLocationsResponse {
  driveTestCentres: DriveTestCenter[];
}

export interface DriveTestCenter {
  closed: boolean;
  openSaturday: boolean;
  city: string;
  province: string;
  postalCode: string;
  id: number;
  name: string;
  licenceTestTypes: string[];
  services: Service[];
  commercialLicenceClasses: CommercialLicenceClass[];
  publicLicenceClasses: PublicLicenceClass[];
  locationHours: LocationHour[];
  latitude: string;
  longitude: string;
  address1: string;
  address2?: string;
  frenchAvailable: boolean;
  isClosed: boolean;
  timezone: Timezone;
  allowsBlockBooking: boolean;
}

/**
 * simplified version with used properties of DriveTestCenter
 */
export type DriveTestCenterLocation = Pick<
  DriveTestCenter,
  "locationHours" | "isClosed" | "name" | "id"
> & {
  /** distance in km */
  distance: number;
  licenceTestTypes?: string[];
};

export interface CommercialLicenceClass {
  licenceClass: string;
  endorsementAvailable: boolean;
}

export interface LocationHour {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface PublicLicenceClass {
  licenceClass: string;
  components?: L[];
  componentDisplay?: ComponentDisplay;
}

export interface ComponentDisplay {
  p: L;
  l: L;
}

export enum L {
  F = "F",
  L = "L",
  P = "P",
}

export interface Service {
  serviceId: number;
  licenceClass: string;
}

export type LicenseClass = PublicLicenseClass | CommercialLicenseClass;

export enum PublicLicenseClass {
  G2 = "G2",
  G = "G",
  M2 = "M2",
  M = "M",
  LM2 = "LM2",
  LM = "LM",
}

export enum CommercialLicenseClass {
  A = "A",
  B = "B",
  C = "C",
  D = "D",
  E = "E",
  F = "F",
  Z = "Z",
}

export enum Timezone {
  Cst = "CST",
  Est = "EST",
}
