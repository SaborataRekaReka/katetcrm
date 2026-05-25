const INTEGRATION_CONTACT_PLACEHOLDER = 'интеграционный контакт';

export function normalizeLeadContactName(contactName: string | null | undefined): string {
  const trimmed = contactName?.trim() ?? '';
  if (!trimmed) return '';
  return trimmed.toLowerCase() === INTEGRATION_CONTACT_PLACEHOLDER ? '' : trimmed;
}

export function resolveLeadDisplayName(input: {
  contactName: string | null | undefined;
  contactPhone: string | null | undefined;
}): string {
  const normalizedName = normalizeLeadContactName(input.contactName);
  if (normalizedName) return normalizedName;

  const phone = input.contactPhone?.trim() ?? '';
  return phone || '—';
}
