function generateCharArray(char1: string, char2: string) {
  let i = char1.charCodeAt(0);
  const j = char2.charCodeAt(0);
  return new Array(j - i + 1)
    .fill(i)
    .map((charCode, index) => String.fromCharCode(charCode + index));
}

export function isInLicenseRange(
  licenseRange: string,
  selectedLicense: string
) {
  const rangeArr = licenseRange.split("-");
  if (rangeArr.length === 2) {
    const [char1, char2] = rangeArr;

    // like if char1 was BZ and the selected license was B, that should return false
    if (char1.length !== selectedLicense.length) {
      return false;
    }

    return generateCharArray(char1, char2).includes(selectedLicense.charAt(0));
  } else {
    return selectedLicense === licenseRange;
  }
}
