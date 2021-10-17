export function getNestedValue(obj: any, property: string): any {
  if (!property.includes(".")) return obj[property];

  return property.split(".").reduce((val, key) => val?.[key], obj);
}
