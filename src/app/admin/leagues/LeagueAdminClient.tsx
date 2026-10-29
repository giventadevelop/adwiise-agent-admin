'use client';

import { useEffect, useState } from 'react';
import AdminBackButton from '@/components/admin/AdminBackButton';
import AdminNavigation from '@/components/AdminNavigation';
import AdminTableActionButtons from '@/components/admin/AdminTableActionButtons';
import AdminTenantFilterBar from '@/components/admin/AdminTenantFilterBar';
import { useAdminTenantId } from '../AdminTenantContext';
import type { LeagueClubDTO, LeagueDTO, LeagueMatchDTO, LeagueStandingDTO, LeagueStandingRowDTO } from '@/types/league';
import {
  copyCalculatedStandings,
  deleteLeague,
  deleteLeagueClub,
  deleteLeagueMatch,
  getStandingsTable,
  listLeagueClubs,
  listLeagueMatches,
  listLeagueStandings,
  listLeagues,
  saveLeague,
  saveLeagueClub,
  saveLeagueMatch,
  saveLeagueStanding,
} from './ApiServerActions';

const emptyLeague = (): LeagueDTO => ({
  name: '',
  status: 'DRAFT',
  standingsSource: 'CALCULATED',
  isPublished: false,
  showOnHomepage: false,
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,
});

const inputClass =
  'mt-1 block w-full border border-gray-400 rounded-xl focus:border-blue-500 focus:ring-blue-500 px-4 py-3 text-base';

const STATUS_BADGE: Record<string, string> = {
  PLAYED: 'bg-emerald-100 text-emerald-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  POSTPONED: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

function YellowCheckbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <span className="relative flex items-center justify-center">
        <input
          type="checkbox"
          className="custom-checkbox custom-checkbox--yellow"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="custom-checkbox-tick">
          {checked && (
            <svg
              className="w-6 h-6 text-gray-800"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
            </svg>
          )}
        </span>
      </span>
      <span className="text-sm font-semibold text-gray-700">{label}</span>
    </label>
  );
}

function formatMatchDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LeagueAdminClient({
  initialLeagues = [],
}: {
  initialLeagues?: LeagueDTO[];
}) {
  const tenantId = useAdminTenantId();
  const [leagues, setLeagues] = useState<LeagueDTO[]>(initialLeagues);
  const [loading, setLoading] = useState(initialLeagues.length === 0);
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [league, setLeague] = useState<LeagueDTO>(emptyLeague());
  const [clubs, setClubs] = useState<LeagueClubDTO[]>([]);
  const [matches, setMatches] = useState<LeagueMatchDTO[]>([]);
  const [stored, setStored] = useState<LeagueStandingDTO[]>([]);
  const [table, setTable] = useState<LeagueStandingRowDTO[]>([]);
  const [clubName, setClubName] = useState('');
  const [homeClub, setHomeClub] = useState(false);
  const [match, setMatch] = useState({
    homeClubId: '',
    awayClubId: '',
    homeScore: '',
    awayScore: '',
    status: 'PLAYED',
    playedAt: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refreshList() {
    const rows = await listLeagues(tenantId);
    setLeagues(Array.isArray(rows) ? rows : []);
  }

  async function openLeague(id: number, current?: LeagueDTO) {
    setMode('edit');
    setSelectedId(id);
    const row = current || leagues.find((item) => item.id === id);
    if (row) setLeague(row);
    const scope = row?.tenantId || tenantId;
    const [clubRows, matchRows, standingRows, tableRows] = await Promise.all([
      listLeagueClubs(id, scope),
      listLeagueMatches(id, scope),
      listLeagueStandings(id, scope),
      getStandingsTable(id, scope),
    ]);
    setClubs(clubRows || []);
    setMatches(matchRows || []);
    setStored(standingRows || []);
    setTable(tableRows || []);
  }

  function startCreate() {
    setMode('create');
    setSelectedId(null);
    setLeague(emptyLeague());
    setClubs([]);
    setMatches([]);
    setStored([]);
    setTable([]);
    setError('');
  }

  function backToList() {
    setMode('list');
    setSelectedId(null);
    setLeague(emptyLeague());
    setClubs([]);
    setMatches([]);
    setStored([]);
    setTable([]);
    setError('');
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listLeagues(tenantId)
      .then((rows) => {
        if (!cancelled) setLeagues(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  async function onSaveLeague(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await saveLeague(league, tenantId || league.tenantId);
      await refreshList();
      if (saved.id) await openLeague(saved.id, saved);
      else backToList();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onDeleteLeague(id: number, scopeTenantId?: string) {
    if (!window.confirm('Delete this league and its related clubs, matches, and standings?')) return;
    setBusy(true);
    setError('');
    try {
      await deleteLeague(id, scopeTenantId || tenantId);
      if (selectedId === id) backToList();
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onAddClub(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !clubName.trim()) return;
    setBusy(true);
    setError('');
    try {
      await saveLeagueClub(
        { leagueId: selectedId, name: clubName.trim(), isHomeClub: homeClub },
        tenantId || league.tenantId
      );
      setClubName('');
      setHomeClub(false);
      await openLeague(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onAddMatch(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    setError('');
    try {
      await saveLeagueMatch(
        {
          leagueId: selectedId,
          homeClubId: Number(match.homeClubId),
          awayClubId: Number(match.awayClubId),
          homeScore: match.homeScore === '' ? null : Number(match.homeScore),
          awayScore: match.awayScore === '' ? null : Number(match.awayScore),
          status: match.status,
          playedAt: match.playedAt ? new Date(match.playedAt).toISOString() : undefined,
        },
        tenantId || league.tenantId
      );
      setMatch({ homeClubId: '', awayClubId: '', homeScore: '', awayScore: '', status: 'PLAYED', playedAt: '' });
      await openLeague(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onCopy() {
    if (!selectedId) return;
    setBusy(true);
    setError('');
    try {
      await copyCalculatedStandings(selectedId, tenantId || league.tenantId);
      const refreshed = await listLeagues(tenantId);
      setLeagues(refreshed);
      const current = refreshed.find((row) => row.id === selectedId);
      if (current) setLeague(current);
      await openLeague(selectedId, current);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSaveManual() {
    if (!selectedId) return;
    setBusy(true);
    setError('');
    try {
      const scope = tenantId || league.tenantId;
      await saveLeague({ ...league, id: selectedId, standingsSource: 'MANUAL' }, scope);
      for (const row of table) {
        const existing = stored.find((item) => item.leagueClubId === row.leagueClubId);
        await saveLeagueStanding(
          {
            id: existing?.id,
            leagueId: selectedId,
            leagueClubId: row.leagueClubId,
            played: row.played,
            won: row.won,
            drawn: row.drawn,
            lost: row.lost,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            points: row.points,
            position: row.position,
          },
          scope
        );
      }
      await openLeague(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function clubNameById(id?: number) {
    return clubs.find((club) => club.id === id)?.name || 'Club';
  }

  if (mode !== 'list') {
    return (
      <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
        <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
          <AdminNavigation />
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8">
          <div className="flex flex-wrap items-center gap-4">
            <AdminBackButton onClick={backToList} label="Back to leagues" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {mode === 'create' ? 'Create new league' : 'Edit league'}
              </h1>
              {league.name && (
                <p className="mt-1 text-sm text-gray-600">
                  {league.name}
                  {league.seasonLabel ? ` · ${league.seasonLabel}` : ''}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 whitespace-pre-wrap">
              {error}
            </div>
          )}

          <form onSubmit={onSaveLeague} className="bg-white rounded-lg shadow-md p-6 space-y-5">
            <h2 className="text-xl font-semibold text-gray-900">League details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">League name</label>
                <input
                  className={inputClass}
                  value={league.name}
                  onChange={(e) => setLeague({ ...league, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Season label</label>
                <input
                  className={inputClass}
                  value={league.seasonLabel || ''}
                  onChange={(e) => setLeague({ ...league, seasonLabel: e.target.value })}
                  placeholder="e.g. Spring 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Homepage order</label>
                <input
                  className={inputClass}
                  type="number"
                  value={league.homepageDisplayOrder ?? ''}
                  onChange={(e) =>
                    setLeague({
                      ...league,
                      homepageDisplayOrder: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={league.description || ''}
                  onChange={(e) => setLeague({ ...league, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  className={inputClass}
                  value={league.status || 'DRAFT'}
                  onChange={(e) => setLeague({ ...league, status: e.target.value })}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="UPCOMING">Upcoming</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Standings source</label>
                <select
                  className={inputClass}
                  value={league.standingsSource || 'CALCULATED'}
                  onChange={(e) => setLeague({ ...league, standingsSource: e.target.value })}
                >
                  <option value="CALCULATED">Calculated</option>
                  <option value="MANUAL">Manual</option>
                </select>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 pt-1">
              <YellowCheckbox
                checked={!!league.isPublished}
                onChange={(next) => setLeague({ ...league, isPublished: next })}
                label="Published"
              />
              <YellowCheckbox
                checked={!!league.showOnHomepage}
                onChange={(next) => setLeague({ ...league, showOnHomepage: next })}
                label="Show on homepage"
              />
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                disabled={busy}
                className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50"
                type="submit"
                title="Save league"
                aria-label="Save league"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                </div>
                <span className="font-semibold text-blue-700">{busy ? 'Saving…' : 'Save league'}</span>
              </button>
              {selectedId && (
                <button
                  disabled={busy}
                  type="button"
                  className="flex-shrink-0 h-14 rounded-xl bg-red-100 hover:bg-red-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50"
                  onClick={() => onDeleteLeague(selectedId, league.tenantId)}
                  title="Delete league"
                  aria-label="Delete league"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-200 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </div>
                  <span className="font-semibold text-red-700">Delete</span>
                </button>
              )}
            </div>
          </form>

          {selectedId && (
            <>
              <section className="bg-white rounded-lg shadow-md p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Clubs</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {clubs.length} club{clubs.length === 1 ? '' : 's'} in this league
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-50 border-b border-blue-100">
                      <tr className="text-left text-blue-900">
                        <th className="px-4 py-3 font-semibold">#</th>
                        <th className="px-4 py-3 font-semibold">Club name</th>
                        <th className="px-4 py-3 font-semibold">Role</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clubs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                            No clubs yet. Add the first club below.
                          </td>
                        </tr>
                      )}
                      {clubs.map((club, index) => (
                        <tr key={club.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500">{index + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{club.name}</td>
                          <td className="px-4 py-3">
                            {club.isHomeClub ? (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-800">
                                This club
                              </span>
                            ) : (
                              <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                                Opponent
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <AdminTableActionButtons
                                compact
                                onDelete={async () => {
                                  if (!club.id) return;
                                  await deleteLeagueClub(club.id, tenantId || league.tenantId);
                                  await openLeague(selectedId);
                                }}
                                deleteTitle="Remove club"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form
                  onSubmit={onAddClub}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-end"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Club name</label>
                    <input
                      className={inputClass}
                      placeholder="e.g. Capital United"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="pb-1">
                    <YellowCheckbox checked={homeClub} onChange={setHomeClub} label="This club" />
                  </div>
                  <button
                    className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
                    type="submit"
                    title="Add club"
                    aria-label="Add club"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="font-semibold text-blue-700">Add club</span>
                  </button>
                </form>
              </section>

              <section className="bg-white rounded-lg shadow-md p-6 space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Results</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {matches.length} match{matches.length === 1 ? '' : 'es'} recorded
                  </p>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-50 border-b border-blue-100">
                      <tr className="text-left text-blue-900">
                        <th className="px-4 py-3 font-semibold">Home</th>
                        <th className="px-4 py-3 font-semibold text-center">Score</th>
                        <th className="px-4 py-3 font-semibold">Away</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Played</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No results yet. Add a match below.
                          </td>
                        </tr>
                      )}
                      {matches.map((row) => (
                        <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{clubNameById(row.homeClubId)}</td>
                          <td className="px-4 py-3 text-center font-semibold text-gray-900 tabular-nums">
                            {row.homeScore ?? '—'} – {row.awayScore ?? '—'}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{clubNameById(row.awayClubId)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                                STATUS_BADGE[row.status || 'PLAYED'] || STATUS_BADGE.PLAYED
                              }`}
                            >
                              {row.status || 'PLAYED'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatMatchDate(row.playedAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <AdminTableActionButtons
                                compact
                                onDelete={async () => {
                                  if (!row.id) return;
                                  await deleteLeagueMatch(row.id, tenantId || league.tenantId);
                                  await openLeague(selectedId);
                                }}
                                deleteTitle="Remove result"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <form onSubmit={onAddMatch} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-800">Add result</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Home club</label>
                      <select
                        className={inputClass}
                        value={match.homeClubId}
                        onChange={(e) => setMatch({ ...match, homeClubId: e.target.value })}
                        required
                      >
                        <option value="">Select home</option>
                        {clubs.map((club) => (
                          <option key={club.id} value={club.id || ''}>
                            {club.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Away club</label>
                      <select
                        className={inputClass}
                        value={match.awayClubId}
                        onChange={(e) => setMatch({ ...match, awayClubId: e.target.value })}
                        required
                      >
                        <option value="">Select away</option>
                        {clubs.map((club) => (
                          <option key={club.id} value={club.id || ''}>
                            {club.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                        className={inputClass}
                        value={match.status}
                        onChange={(e) => setMatch({ ...match, status: e.target.value })}
                      >
                        <option value="PLAYED">Played</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="POSTPONED">Postponed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Home score</label>
                      <input
                        className={inputClass}
                        type="number"
                        min={0}
                        value={match.homeScore}
                        onChange={(e) => setMatch({ ...match, homeScore: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Away score</label>
                      <input
                        className={inputClass}
                        type="number"
                        min={0}
                        value={match.awayScore}
                        onChange={(e) => setMatch({ ...match, awayScore: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Played at</label>
                      <input
                        className={inputClass}
                        type="datetime-local"
                        value={match.playedAt}
                        onChange={(e) => setMatch({ ...match, playedAt: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
                      type="submit"
                      title="Add result"
                      aria-label="Add result"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <span className="font-semibold text-blue-700">Add result</span>
                    </button>
                  </div>
                </form>
              </section>

              <section className="bg-white rounded-lg shadow-md p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Standings</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Source: {league.standingsSource || 'CALCULATED'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="flex-shrink-0 h-14 rounded-xl bg-amber-100 hover:bg-amber-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
                    title="Copy calculated standings"
                    aria-label="Copy calculated standings"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <span className="font-semibold text-amber-800">Copy calculated</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="min-w-full text-sm">
                    <thead className="bg-blue-50 border-b border-blue-100">
                      <tr className="text-left text-blue-900">
                        <th className="px-4 py-3 font-semibold">Pos</th>
                        <th className="px-4 py-3 font-semibold">Club</th>
                        <th className="px-4 py-3 font-semibold text-center">P</th>
                        <th className="px-4 py-3 font-semibold text-center">W</th>
                        <th className="px-4 py-3 font-semibold text-center">D</th>
                        <th className="px-4 py-3 font-semibold text-center">L</th>
                        <th className="px-4 py-3 font-semibold text-center">GF</th>
                        <th className="px-4 py-3 font-semibold text-center">GA</th>
                        <th className="px-4 py-3 font-semibold text-center">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                            Standings will appear after clubs and results are added.
                          </td>
                        </tr>
                      )}
                      {table.map((row, index) => (
                        <tr key={row.leagueClubId} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-500 font-medium">
                            {league.standingsSource === 'MANUAL' ? (
                              <input
                                className="w-16 border border-gray-400 rounded-lg px-2 py-1.5 text-center"
                                type="number"
                                value={row.position ?? 0}
                                onChange={(e) => {
                                  const next = [...table];
                                  next[index] = { ...row, position: Number(e.target.value) };
                                  setTable(next);
                                }}
                              />
                            ) : (
                              row.position ?? index + 1
                            )}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{row.clubName}</td>
                          {(['played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'points'] as const).map(
                            (field) => (
                              <td key={field} className="px-4 py-3 text-center">
                                {league.standingsSource === 'MANUAL' ? (
                                  <input
                                    className="w-16 border border-gray-400 rounded-lg px-2 py-1.5 text-center"
                                    type="number"
                                    value={row[field] ?? 0}
                                    onChange={(e) => {
                                      const next = [...table];
                                      next[index] = { ...row, [field]: Number(e.target.value) };
                                      setTable(next);
                                    }}
                                  />
                                ) : (
                                  <span className="tabular-nums text-gray-800">{row[field] ?? 0}</span>
                                )}
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {league.standingsSource === 'MANUAL' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onSaveManual}
                      className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
                      title="Save manual table"
                      aria-label="Save manual table"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                          />
                        </svg>
                      </div>
                      <span className="font-semibold text-blue-700">Save manual table</span>
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden box-border" style={{ paddingTop: '120px' }}>
      <div className="w-full px-2 sm:px-3 md:px-4 lg:px-6 xl:px-8 mb-6 sm:mb-8">
        <AdminNavigation />
      </div>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <AdminBackButton href="/admin" label="Back to Admin" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leagues</h1>
              <p className="mt-1 text-sm text-gray-600">Manage league seasons, clubs, results, and standings</p>
            </div>
          </div>
        </div>

        <AdminTenantFilterBar />

        {error && <p className="text-red-600 text-sm whitespace-pre-wrap">{error}</p>}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={startCreate}
            className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
            title="Create New League"
            aria-label="Create New League"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="font-semibold text-blue-700">Create New League</span>
          </button>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-blue-50 border-b border-blue-100">
              <tr className="text-left text-blue-900">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Season</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Standings</th>
                <th className="px-4 py-3 font-semibold">Published</th>
                <th className="px-4 py-3 font-semibold">Homepage</th>
                <th className="px-4 py-3 font-semibold">Tenant</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Loading leagues…
                  </td>
                </tr>
              )}
              {!loading && leagues.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No leagues found. Create a league to get started.
                  </td>
                </tr>
              )}
              {!loading &&
                leagues.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-700">{row.seasonLabel || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.status || 'DRAFT'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.standingsSource || 'CALCULATED'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.isPublished ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-gray-700">{row.showOnHomepage ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{row.tenantId || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <AdminTableActionButtons
                          compact
                          onEdit={() => row.id && openLeague(row.id, row)}
                          onDelete={() => row.id && onDeleteLeague(row.id, row.tenantId)}
                          editTitle="Edit league"
                          deleteTitle="Delete league"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
