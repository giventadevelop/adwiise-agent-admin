'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function LeagueAdminClient() {
  const [leagues, setLeagues] = useState<LeagueDTO[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [league, setLeague] = useState<LeagueDTO>(emptyLeague());
  const [clubs, setClubs] = useState<LeagueClubDTO[]>([]);
  const [matches, setMatches] = useState<LeagueMatchDTO[]>([]);
  const [stored, setStored] = useState<LeagueStandingDTO[]>([]);
  const [table, setTable] = useState<LeagueStandingRowDTO[]>([]);
  const [clubName, setClubName] = useState('');
  const [homeClub, setHomeClub] = useState(false);
  const [match, setMatch] = useState({ homeClubId: '', awayClubId: '', homeScore: '', awayScore: '', status: 'PLAYED', playedAt: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function refreshList() {
    const rows = await listLeagues();
    setLeagues(Array.isArray(rows) ? rows : []);
  }

  async function openLeague(id: number) {
    setSelectedId(id);
    const current = leagues.find((row) => row.id === id);
    if (current) setLeague(current);
    const [clubRows, matchRows, standingRows, tableRows] = await Promise.all([
      listLeagueClubs(id),
      listLeagueMatches(id),
      listLeagueStandings(id),
      getStandingsTable(id),
    ]);
    setClubs(clubRows || []);
    setMatches(matchRows || []);
    setStored(standingRows || []);
    setTable(tableRows || []);
  }

  useEffect(() => {
    refreshList().catch((err) => setError(String(err)));
  }, []);

  async function onSaveLeague(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await saveLeague(league);
      await refreshList();
      if (saved.id) await openLeague(saved.id);
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
      await saveLeagueClub({ leagueId: selectedId, name: clubName.trim(), isHomeClub: homeClub });
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
      await saveLeagueMatch({
        leagueId: selectedId,
        homeClubId: Number(match.homeClubId),
        awayClubId: Number(match.awayClubId),
        homeScore: match.homeScore === '' ? null : Number(match.homeScore),
        awayScore: match.awayScore === '' ? null : Number(match.awayScore),
        status: match.status,
        playedAt: match.playedAt ? new Date(match.playedAt).toISOString() : undefined,
      });
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
      await copyCalculatedStandings(selectedId);
      const refreshed = await listLeagues();
      setLeagues(refreshed);
      const current = refreshed.find((row) => row.id === selectedId);
      if (current) setLeague(current);
      await openLeague(selectedId);
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
      await saveLeague({ ...league, id: selectedId, standingsSource: 'MANUAL' });
      for (const row of table) {
        const existing = stored.find((item) => item.leagueClubId === row.leagueClubId);
        await saveLeagueStanding({
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
        });
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Leagues</h1>
        <Link href="/admin" className="text-blue-700 font-semibold">Admin home</Link>
      </div>
      {error && <p className="text-red-600 text-sm whitespace-pre-wrap">{error}</p>}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-2">
          {leagues.map((row) => (
            <button key={row.id} type="button" onClick={() => row.id && openLeague(row.id)} className="w-full text-left px-4 py-3 rounded-lg bg-white border border-gray-200 shadow-sm">
              <span className="font-semibold">{row.name}</span>
              <span className="block text-xs text-gray-500">{row.seasonLabel} · {row.standingsSource} · {row.isPublished ? 'Published' : 'Draft'}</span>
            </button>
          ))}
          <button type="button" onClick={() => { setSelectedId(null); setLeague(emptyLeague()); }} className="text-blue-700 text-sm font-semibold">New league</button>
        </div>
        <form onSubmit={onSaveLeague} className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <input className="w-full border rounded-lg px-3 py-2" placeholder="League name" value={league.name} onChange={(e) => setLeague({ ...league, name: e.target.value })} required />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Season label" value={league.seasonLabel || ''} onChange={(e) => setLeague({ ...league, seasonLabel: e.target.value })} />
          <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Description" value={league.description || ''} onChange={(e) => setLeague({ ...league, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="border rounded-lg px-3 py-2" value={league.status || 'DRAFT'} onChange={(e) => setLeague({ ...league, status: e.target.value })}>
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <select className="border rounded-lg px-3 py-2" value={league.standingsSource || 'CALCULATED'} onChange={(e) => setLeague({ ...league, standingsSource: e.target.value })}>
              <option value="CALCULATED">Calculated</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!league.isPublished} onChange={(e) => setLeague({ ...league, isPublished: e.target.checked })} /> Published</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!league.showOnHomepage} onChange={(e) => setLeague({ ...league, showOnHomepage: e.target.checked })} /> Show on homepage</label>
          <input className="w-full border rounded-lg px-3 py-2" type="number" placeholder="Homepage order" value={league.homepageDisplayOrder ?? ''} onChange={(e) => setLeague({ ...league, homepageDisplayOrder: e.target.value === '' ? null : Number(e.target.value) })} />
          <div className="flex gap-3">
            <button disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold" type="submit">Save league</button>
            {selectedId && <button disabled={busy} type="button" className="px-4 py-2 rounded-lg bg-red-100 text-red-700 font-semibold" onClick={async () => { await deleteLeague(selectedId); setSelectedId(null); setLeague(emptyLeague()); await refreshList(); }}>Delete</button>}
          </div>
        </form>
      </div>

      {selectedId && (
        <>
          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="text-xl font-semibold">Clubs</h2>
            <ul className="space-y-1 text-sm">
              {clubs.map((club) => (
                <li key={club.id} className="flex justify-between">
                  <span>{club.name}{club.isHomeClub ? ' (this club)' : ''}</span>
                  <button type="button" className="text-red-600" onClick={async () => { if (club.id) { await deleteLeagueClub(club.id); await openLeague(selectedId); } }}>Remove</button>
                </li>
              ))}
            </ul>
            <form onSubmit={onAddClub} className="flex flex-wrap gap-2">
              <input className="border rounded-lg px-3 py-2" placeholder="Club name" value={clubName} onChange={(e) => setClubName(e.target.value)} />
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={homeClub} onChange={(e) => setHomeClub(e.target.checked)} /> This club</label>
              <button className="px-4 py-2 rounded-lg bg-blue-100 text-blue-800 font-semibold" type="submit">Add club</button>
            </form>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="text-xl font-semibold">Results</h2>
            <ul className="space-y-1 text-sm">
              {matches.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span>{clubNameById(row.homeClubId)} {row.homeScore ?? '-'} - {row.awayScore ?? '-'} {clubNameById(row.awayClubId)} ({row.status})</span>
                  <button type="button" className="text-red-600" onClick={async () => { if (row.id) { await deleteLeagueMatch(row.id); await openLeague(selectedId); } }}>Remove</button>
                </li>
              ))}
            </ul>
            <form onSubmit={onAddMatch} className="grid md:grid-cols-3 gap-2">
              <select className="border rounded-lg px-3 py-2" value={match.homeClubId} onChange={(e) => setMatch({ ...match, homeClubId: e.target.value })} required>
                <option value="">Home</option>
                {clubs.map((club) => <option key={club.id} value={club.id || ''}>{club.name}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2" value={match.awayClubId} onChange={(e) => setMatch({ ...match, awayClubId: e.target.value })} required>
                <option value="">Away</option>
                {clubs.map((club) => <option key={club.id} value={club.id || ''}>{club.name}</option>)}
              </select>
              <select className="border rounded-lg px-3 py-2" value={match.status} onChange={(e) => setMatch({ ...match, status: e.target.value })}>
                <option value="PLAYED">Played</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="POSTPONED">Postponed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <input className="border rounded-lg px-3 py-2" type="number" placeholder="Home score" value={match.homeScore} onChange={(e) => setMatch({ ...match, homeScore: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" type="number" placeholder="Away score" value={match.awayScore} onChange={(e) => setMatch({ ...match, awayScore: e.target.value })} />
              <input className="border rounded-lg px-3 py-2" type="datetime-local" value={match.playedAt} onChange={(e) => setMatch({ ...match, playedAt: e.target.value })} />
              <button className="px-4 py-2 rounded-lg bg-blue-100 text-blue-800 font-semibold" type="submit">Add result</button>
            </form>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 overflow-x-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Table ({league.standingsSource || 'CALCULATED'})</h2>
              <button type="button" onClick={onCopy} className="px-4 py-2 rounded-lg bg-amber-100 text-amber-800 font-semibold">Copy calculated</button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="text-left"><th>Club</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>Pts</th><th>Pos</th></tr></thead>
              <tbody>
                {table.map((row, index) => (
                  <tr key={row.leagueClubId}>
                    <td className="py-1">{row.clubName}</td>
                    {(['played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'points', 'position'] as const).map((field) => (
                      <td key={field}>
                        <input
                          className="w-16 border rounded px-1 py-1"
                          type="number"
                          disabled={league.standingsSource !== 'MANUAL'}
                          value={row[field] ?? 0}
                          onChange={(e) => {
                            const next = [...table];
                            next[index] = { ...row, [field]: Number(e.target.value) };
                            setTable(next);
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {league.standingsSource === 'MANUAL' && (
              <button type="button" onClick={onSaveManual} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold">Save manual table</button>
            )}
          </section>
        </>
      )}
    </div>
  );
}
