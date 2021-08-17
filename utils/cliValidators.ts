import { InvalidOptionArgumentError } from "commander";

import { Coordinates } from "./distanceTo";

export function parseCommanderInt(
  value: string,
  command: string,
  max?: number,
) {
  const number = Number(value);
  if (isNaN(number)) {
    throw new InvalidOptionArgumentError(`${command} is not a number!`);
  }
  return typeof max === "undefined" ? number : Math.min(number, max);
}

export function verifyLicenseNumber(licenseNumber: string) {
  if (!/[A-Z][0-9]{4}-[0-9]{5}-[0-9]{5}/.test(licenseNumber)) {
    throw new InvalidOptionArgumentError(
      "license number must match format found here: https://www.services.gov.on.ca/wps85/wcm/connect/s2i/34491094-6a43-4d56-a152-317816e236a5/2/qvkgtrfx4296227867638271464.png?MOD=AJPERES&CVID=",
    );
  }

  return licenseNumber;
}

export function verifyDateFormat(date: string) {
  if (!/^\d{4}\/(0?[1-9]|1[012])\/(0?[1-9]|[12][0-9]|3[01])$/.test(date)) {
    throw new InvalidOptionArgumentError("date must follow format YYYY/MM/DD!");
  }
  return date;
}

export function parseLocation(location: string): Coordinates {
  const coordinates = location
    .split(",")
    .filter((coordinate) => coordinate.length > 0)
    .map((coordinate) => Number(coordinate));
  if (
    coordinates.length < 2 ||
    coordinates.some((coordinate) => isNaN(coordinate))
  ) {
    throw new InvalidOptionArgumentError(
      "location coordinates must follow format <latitude>,<longitude>!",
    );
  }

  return {
    latitude: coordinates[0],
    longitude: coordinates[1],
  };
}
