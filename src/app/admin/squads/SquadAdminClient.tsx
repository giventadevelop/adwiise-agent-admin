'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { TeamGroupDTO } from '@/types/teamGroup';
import type { TeamGroupMembershipDTO } from '@/types/league';
import type { TeamMemberDTO } from '@/types/teamMember';
import { deleteMembership, listMemberships, listSquadMembers, listSquads, saveMembership, saveSquad } from '../leagues/ApiServerActions';

export default function SquadAdminClient() {
  const [groups, setGroups] = useState<TeamGroupDTO[]>([]);
  const [members, setMembers] = useState<TeamMemberDTO[]>([]);
  const [memberships, setMemberships] = useState<TeamGroupMembershipDTO[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [memberId, setMemberId] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [error, setError] = useState('');

  async function load() {
    const [groupRows, memberRows, membershipRows] = await Promise.all([listSquads(), listSquadMembers(), listMemberships()]);
    setGroups(groupRows || []);
    setMembers(memberRows || []);
    setMemberships(membershipRows || []);
  }

  useEffect(() => {
    load().catch((err) => setError(String(err)));
  }, []);

  const memberMemberships = useMemo(
    () => memberships.filter((row) => String(row.teamMemberId) === memberId),
    [memberships, memberId]
  );

  useEffect(() => {
    setSelectedGroups(memberMemberships.map((row) => row.teamGroupId));
  }, [memberId, memberships]);

  async function onCreateGroup(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await saveSquad({ id: null, name, categoryLabel: category, teamType: 'SPORTS', isActive: true });
      setName('');
      setCategory('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function onSaveMemberships(event: React.FormEvent) {
    event.preventDefault();
    if (!memberId) return;
    setError('');
    try {
      const current = memberships.filter((row) => String(row.teamMemberId) === memberId);
      for (const groupId of selectedGroups) {
        if (!current.some((row) => row.teamGroupId === groupId)) {
          await saveMembership({ teamGroupId: groupId, teamMemberId: Number(memberId), isActive: true });
        }
      }
      for (const row of current) {
        if (row.id && !selectedGroups.includes(row.teamGroupId)) {
          await deleteMembership(row.id);
        }
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Squads</h1>
        <Link href="/admin" className="text-blue-700 font-semibold">Admin home</Link>
      </div>
      {error && <p className="text-red-600 text-sm whitespace-pre-wrap">{error}</p>}
      <form onSubmit={onCreateGroup} className="bg-white border rounded-xl p-4 grid md:grid-cols-3 gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="Squad name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="border rounded-lg px-3 py-2" placeholder="Category (Kids, Over 40)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold" type="submit">Create squad</button>
      </form>
      <ul className="bg-white border rounded-xl divide-y">
        {groups.map((group) => (
          <li key={group.id} className="px-4 py-3 flex justify-between">
            <span className="font-semibold">{group.name}</span>
            <span className="text-sm text-gray-500">{group.categoryLabel || 'No category'}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={onSaveMemberships} className="bg-white border rounded-xl p-4 space-y-3">
        <h2 className="text-xl font-semibold">Assign a person to squads</h2>
        <select className="w-full border rounded-lg px-3 py-2" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">Choose a member</option>
          {members.map((member) => (
            <option key={member.id} value={member.id || ''}>{member.firstName} {member.lastName}</option>
          ))}
        </select>
        <div className="grid sm:grid-cols-2 gap-2">
          {groups.map((group) => (
            <label key={group.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={group.id != null && selectedGroups.includes(group.id)}
                onChange={(e) => {
                  if (group.id == null) return;
                  setSelectedGroups((current) => e.target.checked ? [...current, group.id as number] : current.filter((id) => id !== group.id));
                }}
              />
              {group.name}{group.categoryLabel ? ` · ${group.categoryLabel}` : ''}
            </label>
          ))}
        </div>
        <button className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold" type="submit" disabled={!memberId}>Save memberships</button>
      </form>
    </div>
  );
}
