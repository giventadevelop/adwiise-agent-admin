import type { LeagueDTO } from '@/types/league';
import { listLeagues } from './ApiServerActions';
import LeagueAdminClient from './LeagueAdminClient';

export const dynamic = 'force-dynamic';

type LeagueSearchParams = { tenant?: string };

export default async function LeaguesAdminPage(props: {
  searchParams?: Promise<LeagueSearchParams> | LeagueSearchParams;
}) {
  const searchParams =
    props.searchParams && typeof (props.searchParams as Promise<LeagueSearchParams>).then === 'function'
      ? await (props.searchParams as Promise<LeagueSearchParams>)
      : ((props.searchParams as LeagueSearchParams | undefined) ?? {});

  const tenantId = searchParams.tenant?.trim() || undefined;
  let initialLeagues: LeagueDTO[] = [];
  try {
    initialLeagues = await listLeagues(tenantId);
  } catch (error) {
    console.error('[LeaguesAdminPage] Failed to load leagues:', error);
  }

  return <LeagueAdminClient initialLeagues={initialLeagues} />;
}
