export interface Coordinates {
  latitude: number;
  longitude: number;
}

export const enum Unit {
  Kilometers,
  Miles,
  NauticalMiles,
}

export function distanceTo(
  { latitude: lat1, longitude: lon1 }: Coordinates,
  { latitude: lat2, longitude: lon2 }: Coordinates,
  unit: Unit
) {
  const rlat1 = (Math.PI * lat1) / 180;
  const rlat2 = (Math.PI * lat2) / 180;
  const theta = lon1 - lon2;
  const rtheta = (Math.PI * theta) / 180;
  let dist =
    Math.sin(rlat1) * Math.sin(rlat2) +
    Math.cos(rlat1) * Math.cos(rlat2) * Math.cos(rtheta);
  dist = Math.acos(dist);
  dist = (dist * 180) / Math.PI;
  dist = dist * 60 * 1.1515;

  if (unit == Unit.Kilometers) {
    return dist * 1.609344;
  } else if (unit === Unit.NauticalMiles) {
    return dist * 0.8684;
  }

  return dist;
}
