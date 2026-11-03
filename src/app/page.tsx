import { BRAND_NAME, BRAND_TAGLINE, BRAND_LOGO_PATH } from '@/lib/brand';
import HubEntryButton from './HubEntryButton';

/**
 * Admin hub root. This project is not a tenant public site — do not load
 * events, sponsors, team, or other tenant-scoped homepage sections here.
 * The entry button is client-side so a sign-out is not stuck on a cached signed-in render.
 */
export const dynamic = 'force-dynamic';

export default function RootPage() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4 py-16 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={BRAND_LOGO_PATH} alt={BRAND_NAME} className="h-16 w-auto" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{BRAND_NAME}</h1>
          <p className="text-base sm:text-lg text-gray-600">{BRAND_TAGLINE}</p>
          <p className="text-sm text-gray-500">
            Platform admin hub. Public event, team, and sponsor content lives on each tenant site — not here.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <HubEntryButton />
        </div>
      </div>
    </main>
  );
}
