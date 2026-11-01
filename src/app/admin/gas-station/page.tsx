import redirectGasRoute from './redirectToRetail';

export default async function GasStationPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }> | { tenant?: string };
}) {
  await redirectGasRoute('/admin/retail', searchParams);
}
