import { getAppUrl } from '@/lib/env';
import AdminNavigation from '@/components/AdminNavigation';

async function fetchGroup(baseUrl: string, id: string) {
  try {
    const res = await fetch(`${baseUrl}/api/proxy/focus-groups/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchLinkedEvents(baseUrl: string, id: string) {
  try {
    const res = await fetch(`${baseUrl}/api/proxy/event-details?focusGroupId.equals=${id}&sort=startDate,desc`, { cache: 'no-store' });
    if (!res.ok) return [];
    return Array.isArray(await res.json()) ? await res.json() : [];
  } catch { return []; }
}

async function fetchAllEvents(baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}/api/proxy/event-details?sort=startDate,desc&page=0&size=100`, { cache: 'no-store' });
    if (!res.ok) return [];
    return Array.isArray(await res.json()) ? await res.json() : [];
  } catch { return []; }
}

export default async function ManageGroupEventsPage({ params }: { params: { id: string } }) {
  const baseUrl = getAppUrl();
  const group = await fetchGroup(baseUrl, params.id);
  const linked = await fetchLinkedEvents(baseUrl, params.id);
  const all = await fetchAllEvents(baseUrl);
  const linkedIds = new Set(linked.map((e: any) => e.id));
  const candidates = all.filter((e: any) => !linkedIds.has(e.id));

  return (
    <div className="px-8 pt-24 pb-8 max-w-5xl mx-auto">
      <AdminNavigation
        tenantId={group?.tenantId}
        contextLine="Events linked to this focus group."
      />
      <h1 className="text-2xl font-semibold mb-2">Manage Events for: {group?.name ?? 'Focus Group'}</h1>
      <div className="text-sm text-gray-600 mb-6">Link or unlink events to this focus group.</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Linked Events</h2>
          <ul className="space-y-2">
            {linked.map((e: any) => (
              <li key={e.id} className="flex items-center justify-between text-sm">
                <span>{e.title}</span>
                <form action={`${baseUrl}/api/proxy/event-focus-groups`} method="post">
                  <input type="hidden" name="_method" value="DELETE" />
                  <input type="hidden" name="eventId" value={e.id} />
                  <input type="hidden" name="focusGroupId" value={params.id} />
                  <button className="px-2 py-1 text-red-600 hover:text-red-800">Unlink</button>
                </form>
              </li>
            ))}
            {linked.length === 0 && <li className="text-gray-500 text-sm">No linked events.</li>}
          </ul>
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Link New Event</h2>
          <form action={`${baseUrl}/api/proxy/event-focus-groups`} method="post" className="flex gap-2">
            <input type="hidden" name="focusGroupId" value={params.id} />
            <select name="eventId" className="border rounded px-2 py-1 flex-1">
              {candidates.map((e: any) => (
                <option key={e.id} value={e.id}>{e.title}</option>
              ))}
            </select>
            <button className="px-3 py-1 bg-blue-600 text-white rounded">Link</button>
          </form>
        </div>
      </div>
    </div>
  );
}
