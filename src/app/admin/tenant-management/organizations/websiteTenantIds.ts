/** Website tenant ids stored on tenant settings, with the old organization field as a fallback. */
export function websiteTenantIdsOf(org: {
  websiteTenantIds?: string[] | null;
  tenantId?: string | null;
}): string[] {
  const fromSettings = (org.websiteTenantIds ?? [])
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  if (fromSettings.length > 0) {
    return [...new Set(fromSettings)];
  }
  const legacy = org.tenantId?.trim();
  return legacy ? [legacy] : [];
}
