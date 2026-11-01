import { redirect } from 'next/navigation';

type Search = { tenant?: string };

export default async function redirectGasRoute(
  target: string,
  searchParams: Promise<Search> | Search
): Promise<never> {
  const params = typeof (searchParams as Promise<Search>).then === 'function'
    ? await (searchParams as Promise<Search>)
    : (searchParams as Search);
  const tenant = params?.tenant ? `?tenant=${encodeURIComponent(params.tenant)}` : '';
  redirect(`${target}${tenant}`);
}
