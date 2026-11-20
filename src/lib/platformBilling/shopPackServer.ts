import { fetchRetailerTypes } from '@/app/admin/access-catalogs/ApiServerActions';
import { fetchTenantOrganizationByTenantId } from '@/app/admin/tenant-management/organizations/ApiServerActions';
import { loadOrganization } from '@/lib/platformBilling/stripeCheckout';
import { packLabel, retailPacks } from '@/lib/platformBilling/shopPack';
import type { RetailerTypeDTO } from '@/types/accessCatalog';

export async function loadShopPack(tenantId: string): Promise<{ code: string | null; label: string | null }> {
  const [linked, fallback, packs] = await Promise.all([
    fetchTenantOrganizationByTenantId(tenantId).catch(() => null),
    loadOrganization(tenantId).catch(() => null),
    fetchRetailerTypes(tenantId).catch(() => [] as RetailerTypeDTO[]),
  ]);
  const code = (linked?.retailerTypeCode || fallback?.retailerTypeCode || '').trim() || null;
  return { code, label: packLabel(code, retailPacks(packs)) };
}
