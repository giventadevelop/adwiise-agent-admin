import redirectGasRoute from '../redirectToRetail';

export default async function GasStationsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }> | { tenant?: string };
}) {
  await redirectGasRoute('/admin/retail/locations', searchParams);
}
