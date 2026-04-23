/**
 * Нормализация телефона для поиска дублей.
 * Оставляем только цифры, затем приводим к виду "7XXXXXXXXXX"
 * (8 в начале → 7; ведущие нули и + удаляются).
 * Примеры:
 *   "+7 (495) 000-00-01" → "74950000001"
 *   "8 495 000 00 01"    → "74950000001"
 *   "(495) 000-00-01"    → "4950000001" (без кода — оставляем как есть)
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return '';
  const digits = input.replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  return digits;
}

/** Нормализация названия компании (lowercase + схлопывание пробелов). */
export function normalizeCompany(input: string | null | undefined): string {
  if (!input) return '';
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}
