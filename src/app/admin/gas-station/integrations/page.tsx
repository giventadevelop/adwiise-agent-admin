import redirectGasRoute from '../redirectToRetail';

export default async function GasIntegrationsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }> | { tenant?: string };
}) {
  await redirectGasRoute('/admin/retail/integrations', searchParams);
}
