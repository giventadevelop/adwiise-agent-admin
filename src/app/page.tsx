import HubLanding from '@/components/hub-landing/HubLanding';

/**
 * Admin hub root. This project is not a tenant public site — do not load
 * events, sponsors, team, or other tenant-scoped homepage sections here.
 * The landing page is static; its entry buttons are client-side so a sign-out
 * is not stuck on a cached signed-in render.
 */
export const dynamic = 'force-dynamic';

export default function RootPage() {
  return <HubLanding />;
}
