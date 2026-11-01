import redirectGasRoute from '../redirectToRetail';

export default async function GasAccessRedirect({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }> | { tenant?: string };
}) {
  await redirectGasRoute('/admin/retail/access', searchParams);
}
