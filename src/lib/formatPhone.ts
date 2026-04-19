export function formatPhoneTo254(phone: string): string {
  const cleaned = phone.replace(/[\s+\-]/g, '');
  if (cleaned.startsWith('0')) {
    return '254' + cleaned.slice(1);
  }
  if (cleaned.startsWith('254')) {
    return cleaned;
  }
  return cleaned;
}

export function isValidKenyanPhone(phone: string): boolean {
  const formatted = formatPhoneTo254(phone);
  return /^254[17]\d{8}$/.test(formatted);
}

export function formatPhoneDisplay(phone: string): string {
  const formatted = formatPhoneTo254(phone);
  return '0' + formatted.slice(3);
}
