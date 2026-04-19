/** Normalize and validate Kenyan mobile numbers. */

const SAFARICOM_PREFIXES = ["10", "11", "70", "71", "72", "74", "79", "75", "76", "77", "78"];

export function formatPhoneTo254(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.length === 9) return "254" + digits;
  return digits;
}

export function isValidKenyanPhone(input: string): boolean {
  const normalized = formatPhoneTo254(input);
  if (normalized.length !== 12) return false;
  if (!normalized.startsWith("254")) return false;
  const prefix = normalized.slice(3, 5);
  return SAFARICOM_PREFIXES.includes(prefix) || /^[0-9]{2}$/.test(prefix);
}

export function displayPhone(input: string): string {
  const n = formatPhoneTo254(input);
  if (n.length !== 12) return input;
  return `+${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
}
