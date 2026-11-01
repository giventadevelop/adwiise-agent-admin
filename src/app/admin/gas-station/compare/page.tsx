import redirectGasRoute from '../redirectToRetail';

export default async function GasCompareRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }> | { tenant?: string };
}) {
  await redirectGasRoute('/admin/retail/compare', searchParams);
}
