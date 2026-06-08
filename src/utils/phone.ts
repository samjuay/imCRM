export function normalizeIndianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("91") && digits.length === 12) {
    return digits;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

export function getTelLink(phone: string): string {
  return `tel:+${normalizeIndianPhone(phone)}`;
}

export function getWhatsAppLink(phone: string): string {
  return `https://wa.me/${normalizeIndianPhone(phone)}`;
}