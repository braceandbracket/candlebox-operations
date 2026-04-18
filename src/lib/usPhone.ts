/** US national number only (10 digits) for monday Phone column payloads. */
export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Formats up to 10 digits as xxx-xxx-xxxx while typing. */
export function formatUsPhoneMask(value: string): string {
  const d = digitsOnly(value).slice(0, 10);
  if (d.length <= 3) {
    return d;
  }
  if (d.length <= 6) {
    return `${d.slice(0, 3)}-${d.slice(3)}`;
  }
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** Strips leading 1 from 11-digit input; returns 10 digits or null. */
export function national10Digits(value: string): string | null {
  let d = digitsOnly(value);
  if (d.length === 11 && d.startsWith("1")) {
    d = d.slice(1);
  }
  if (d.length !== 10) {
    return null;
  }
  return d;
}
