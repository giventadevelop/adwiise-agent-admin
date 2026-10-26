'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { TeamGroupDTO } from '@/types/teamGroup';
import type { TeamMemberDTO, TeamMemberFormData } from '@/types/teamMember';
import type { TeamMemberAchievementDTO } from '@/types/teamMemberAchievement';
import {
  createTeamMember,
  createTeamMemberAchievement,
  deleteTeamMemberAchievement,
  fetchTeamMemberAchievements,
  updateTeamMember,
  updateTeamMemberAchievement,
} from './ApiServerActions';
import { uploadSquadMemberProfileImage } from './TeamMemberUploadActions';
import DragDropImageUpload from '@/components/DragDropImageUpload';
import { useAdminTenantId } from '../AdminTenantContext';
import { fetchRosterCatalog } from '../roster-catalogs/ApiServerActions';
import { selectedSportIds } from '@/lib/sportsCategories';
import {
  FOOTBALL_CODE,
  parseRecentMatches,
  parseSportProfiles,
  serializeRecentMatches,
  serializeSportProfiles,
  type RecentMatchesState,
  type SportProfileDocument,
} from '@/lib/sportProfileForm';
import { RecentMatchEditor, SportProfileCards } from './SportProfileSections';
import type { RosterCatalogDTO } from '@/types/rosterCatalog';

interface TeamMemberFormProps {
  member?: TeamMemberDTO | null;
  groups: TeamGroupDTO[];
  defaultGroupId?: number;
  onSuccess: (member: TeamMemberDTO) => void;
  onCancel: () => void;
}

function parseExpertise(raw?: string): string[] {
  if (!raw) return [''];
  if (raw.startsWith('[')) {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) && p.length ? p : [''];
    } catch {
      return [raw];
    }
  }
  return raw.trim() ? raw.split(/\s+/).filter(Boolean) : [''];
}

type AchievementDraft = {
  key: string;
  id?: number;
  title: string;
  achievementDate: string;
  category: string;
  description: string;
};

function numOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function emptyAchievement(): AchievementDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    achievementDate: '',
    category: '',
    description: '',
  };
}

export default function TeamMemberForm({
  member,
  groups,
  defaultGroupId,
  onSuccess,
  onCancel,
}: TeamMemberFormProps) {
  const tenantId = useAdminTenantId();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(member?.profileImageUrl || null);
  const [expertiseItems, setExpertiseItems] = useState<string[]>(() => parseExpertise(member?.expertise));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [achievements, setAchievements] = useState<AchievementDraft[]>([]);
  const [removedAchievementIds, setRemovedAchievementIds] = useState<number[]>([]);
  const [sportOptions, setSportOptions] = useState<RosterCatalogDTO[]>([]);
  const [achievementOptions, setAchievementOptions] = useState<RosterCatalogDTO[]>([]);
  const [selectedSports, setSelectedSports] = useState<number[]>(() => member?.sportCategoryIds ?? []);
  const [profileDoc, setProfileDoc] = useState<SportProfileDocument>(() => parseSportProfiles(member?.sportProfiles));
  const [recentMatchState, setRecentMatchState] = useState<RecentMatchesState>(() =>
    parseRecentMatches(member?.recentMatches)
  );

  const { register, handleSubmit, setValue, watch } = useForm<TeamMemberFormData>({
    defaultValues: {
      teamGroupId: member?.teamGroupId ?? defaultGroupId ?? groups[0]?.id ?? 0,
      firstName: member?.firstName || '',
      lastName: member?.lastName || '',
      title: member?.title || '',
      designation: member?.designation || '',
      bio: member?.bio || '',
      email: member?.email || '',
      expertise: parseExpertise(member?.expertise),
      priorityOrder: member?.priorityOrder ?? 0,
      isActive: member?.isActive ?? true,
      jerseyNumber: member?.jerseyNumber ?? undefined,
      position: member?.position || '',
      lineupSubtitle: member?.lineupSubtitle || '',
      instrument: member?.instrument || '',
      vocalRole: member?.vocalRole || '',
      userProfileId: member?.userProfileId ?? undefined,
      nationality: member?.nationality || '',
      dateOfBirth: member?.dateOfBirth ? member.dateOfBirth.slice(0, 10) : '',
      preferredFoot: member?.preferredFoot || '',
      heightCm: member?.heightCm ?? undefined,
      instagramUrl: member?.instagramUrl || '',
      seasonLabel: member?.seasonLabel || '',
      seasonAppearances: member?.seasonAppearances ?? undefined,
      seasonGoals: member?.seasonGoals ?? undefined,
      seasonAssists: member?.seasonAssists ?? undefined,
      seasonMinutes: member?.seasonMinutes ?? undefined,
      seasonWins: member?.seasonWins ?? undefined,
      seasonDraws: member?.seasonDraws ?? undefined,
      seasonLosses: member?.seasonLosses ?? undefined,
      passAccuracyPct: member?.passAccuracyPct ?? undefined,
      shotAccuracyPct: member?.shotAccuracyPct ?? undefined,
      topSpeedKmh: member?.topSpeedKmh ?? undefined,
      careerAppearances: member?.careerAppearances ?? undefined,
      careerGoals: member?.careerGoals ?? undefined,
      careerAssists: member?.careerAssists ?? undefined,
      coachName: member?.coachName || '',
      coachEmail: member?.coachEmail || '',
      coachPhone: member?.coachPhone || '',
    },
  });

  const watchedGroupId = watch('teamGroupId');
  const isMusic = groups.find((g) => g.id === Number(watchedGroupId))?.teamType === 'MUSIC';

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchRosterCatalog('sports-categories', tenantId),
      fetchRosterCatalog('achievement-categories', tenantId),
    ])
      .then(([sports, categories]) => {
        if (cancelled) return;
        const activeSports = sports.filter((row) => row.isActive !== false && row.id != null);
        setSportOptions(activeSports);
        setAchievementOptions(categories.filter((row) => row.isActive !== false && row.code));
        setSelectedSports(selectedSportIds(member, activeSports));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load sports catalogs');
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId, member]);

  useEffect(() => {
    if (member?.id == null) return;
    let cancelled = false;
    fetchTeamMemberAchievements(member.id)
      .then((rows) => {
        if (cancelled) return;
        setAchievements(
          rows.map((row) => ({
            key: `id-${row.id}`,
            id: row.id ?? undefined,
            title: row.title || '',
            achievementDate: row.achievementDate ? row.achievementDate.slice(0, 10) : '',
            category: row.category || '',
            description: row.description || '',
          }))
        );
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load achievements');
      });
    return () => {
      cancelled = true;
    };
  }, [member?.id]);

  const onSubmit = async (data: TeamMemberFormData) => {
    setError('');
    if (!data.teamGroupId) {
      setError('Team group is required');
      return;
    }
    if (!data.firstName?.trim() || !data.lastName?.trim()) {
      setError('First and last name are required');
      return;
    }
    if (achievements.some((row) => row.title.trim() && !row.category)) {
      setError('Each achievement needs a category');
      return;
    }
    setSaving(true);
    try {
      const filteredExpertise = expertiseItems.filter((x) => x.trim());
      const payload = {
        teamGroupId: Number(data.teamGroupId),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        title: data.title?.trim() || `${data.firstName} ${data.lastName}`,
        designation: data.designation?.trim() || undefined,
        bio: data.bio?.trim() || undefined,
        email: data.email?.trim() || undefined,
        expertise: filteredExpertise.length ? JSON.stringify(filteredExpertise) : undefined,
        priorityOrder: Number(data.priorityOrder) || 0,
        isActive: data.isActive ?? true,
        jerseyNumber:
          data.jerseyNumber != null && !Number.isNaN(Number(data.jerseyNumber))
            ? Number(data.jerseyNumber)
            : null,
        position: data.position?.trim() || undefined,
        lineupSubtitle: data.lineupSubtitle?.trim() || undefined,
        instrument: data.instrument?.trim() || undefined,
        vocalRole: data.vocalRole?.trim() || undefined,
        userProfileId: data.userProfileId ? Number(data.userProfileId) : null,
        nationality: data.nationality?.trim() || undefined,
        dateOfBirth: data.dateOfBirth?.trim() || undefined,
        preferredFoot: data.preferredFoot?.trim() || undefined,
        heightCm:
          data.heightCm != null && !Number.isNaN(Number(data.heightCm)) ? Number(data.heightCm) : null,
        instagramUrl: data.instagramUrl?.trim() || undefined,
        profileImageUrl: member?.profileImageUrl,
        ...(sportOptions.length
          ? {
              sportCategoryIds: selectedSports,
              sportProfiles: serializeSportProfiles(
                profileDoc,
                sportOptions
                  .filter((sport) => sport.id != null && sport.code && selectedSports.includes(sport.id))
                  .map((sport) => sport.code as string)
              ),
            }
          : { sportProfiles: member?.sportProfiles }),
        seasonLabel: data.seasonLabel?.trim() || null,
        seasonAppearances: numOrNull(data.seasonAppearances),
        seasonGoals: numOrNull(data.seasonGoals),
        seasonAssists: numOrNull(data.seasonAssists),
        seasonMinutes: numOrNull(data.seasonMinutes),
        seasonWins: numOrNull(data.seasonWins),
        seasonDraws: numOrNull(data.seasonDraws),
        seasonLosses: numOrNull(data.seasonLosses),
        passAccuracyPct: numOrNull(data.passAccuracyPct),
        shotAccuracyPct: numOrNull(data.shotAccuracyPct),
        topSpeedKmh: numOrNull(data.topSpeedKmh),
        careerAppearances: numOrNull(data.careerAppearances),
        careerGoals: numOrNull(data.careerGoals),
        careerAssists: numOrNull(data.careerAssists),
        coachName: data.coachName?.trim() || null,
        coachEmail: data.coachEmail?.trim() || null,
        coachPhone: data.coachPhone?.trim() || null,
        recentMatches: isMusic ? member?.recentMatches ?? null : serializeRecentMatches(recentMatchState),
      };

      let result =
        member?.id != null
          ? await updateTeamMember(member.id, payload, tenantId)
          : await createTeamMember(payload as Omit<TeamMemberDTO, 'id'>, tenantId);

      if (!result?.id) throw new Error('Save failed');

      const filled = achievements.filter((row) => row.title.trim());
      for (const achievementId of removedAchievementIds) {
        await deleteTeamMemberAchievement(achievementId);
      }
      for (let index = 0; index < filled.length; index += 1) {
        const row = filled[index];
        const body: Omit<TeamMemberAchievementDTO, 'id'> = {
          teamMemberId: result.id,
          title: row.title.trim(),
          description: row.description.trim() || undefined,
          achievementDate: row.achievementDate || undefined,
          category: row.category,
          achievementCategoryId:
            achievementOptions.find((option) => option.code === row.category)?.id ?? undefined,
          displayOrder: index,
        };
        if (row.id != null) {
          await updateTeamMemberAchievement(row.id, body, tenantId);
        } else {
          await createTeamMemberAchievement(body, tenantId);
        }
      }

      if (imageFile) {
        const url = await uploadSquadMemberProfileImage(result.id, imageFile);
        if (url && !url.startsWith('upload-successful')) {
          result = (await updateTeamMember(result.id, { profileImageUrl: url }, tenantId)) ?? result;
        }
      }

      onSuccess(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'mt-1 w-full border border-gray-400 rounded-xl px-4 py-3 text-base';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-3xl max-h-[70vh] overflow-y-auto pr-2">
      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700">Team group *</label>
        <select {...register('teamGroupId', { valueAsNumber: true })} className={inputClass}>
          {groups.map((g) => (
            <option key={g.id} value={g.id ?? ''}>
              {g.name} ({g.teamType})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">First name *</label>
          <input {...register('firstName')} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Last name *</label>
          <input {...register('lastName')} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input {...register('title')} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Priority order</label>
          <input type="number" {...register('priorityOrder', { valueAsNumber: true })} className={inputClass} />
          <p className="text-xs text-gray-500 mt-1">Lower number = appears first in carousel.</p>
        </div>
        {!isMusic && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Jersey number</label>
              <input type="number" {...register('jerseyNumber', { valueAsNumber: true })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Position</label>
              <input {...register('position')} className={inputClass} />
            </div>
          </>
        )}
        {isMusic && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">Instrument</label>
              <input {...register('instrument')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vocal role</label>
              <input {...register('vocalRole')} className={inputClass} />
            </div>
          </>
        )}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Lineup subtitle</label>
          <input {...register('lineupSubtitle')} placeholder="e.g. FIRST TEAM" className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <fieldset className="rounded-xl border border-gray-300 bg-gray-50 p-4">
            <legend className="px-2 text-sm font-semibold text-gray-900">Sports categories</legend>
            <p className="mb-3 text-sm text-gray-600">
              Select every sport this member plays. More than one can be selected.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {sportOptions.length === 0 && (
                <p className="text-sm text-gray-500">No active sports yet. Add them under Roster catalogs.</p>
              )}
              {sportOptions.map((sport) => {
                const sportId = sport.id as number;
                const checked = selectedSports.includes(sportId);
                return (
                  <label
                    key={sportId}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
                      checked ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-blue-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedSports((prev) =>
                          prev.includes(sportId) ? prev.filter((id) => id !== sportId) : [...prev, sportId]
                        );
                      }}
                      className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-800">{sport.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          <div className="mt-4">
            <SportProfileCards
              sports={sportOptions
                .filter(
                  (sport) =>
                    sport.id != null &&
                    sport.code &&
                    sport.code !== FOOTBALL_CODE &&
                    selectedSports.includes(sport.id)
                )
                .map((sport) => ({ code: sport.code as string, label: sport.label || sport.code || 'Sport' }))}
              profileDocument={profileDoc}
              onChange={setProfileDoc}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input type="email" {...register('email')} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">User profile ID (optional)</label>
          <input type="number" {...register('userProfileId', { valueAsNumber: true })} className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <input {...register('designation')} placeholder="Captain, Coach, Forward" className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Biography</label>
          <textarea {...register('bio')} rows={4} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Nationality</label>
          <input {...register('nationality')} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date of birth</label>
          <input type="date" {...register('dateOfBirth')} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Preferred foot</label>
          <select {...register('preferredFoot')} className={inputClass}>
            <option value="">Not set</option>
            <option value="LEFT">Left</option>
            <option value="RIGHT">Right</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Height (cm)</label>
          <input type="number" {...register('heightCm', { valueAsNumber: true })} className={inputClass} />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Instagram</label>
          <input {...register('instagramUrl')} placeholder="https://instagram.com/…" className={inputClass} />
        </div>
      </div>

      {!isMusic && (
        <fieldset className="rounded-xl border border-gray-300 bg-gray-50 p-4">
          <legend className="px-2 text-sm font-semibold text-gray-900">Season and career</legend>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700">Season label</label>
              <input {...register('seasonLabel')} placeholder="2026" className={inputClass} />
            </div>
            {(
              [
                ['seasonAppearances', 'Appearances'],
                ['seasonGoals', 'Goals'],
                ['seasonAssists', 'Assists'],
                ['seasonMinutes', 'Minutes'],
                ['seasonWins', 'Wins'],
                ['seasonDraws', 'Draws'],
                ['seasonLosses', 'Losses'],
                ['passAccuracyPct', 'Pass accuracy %'],
                ['shotAccuracyPct', 'Shot accuracy %'],
                ['topSpeedKmh', 'Top speed (km/h)'],
                ['careerAppearances', 'Career appearances'],
                ['careerGoals', 'Career goals'],
                ['careerAssists', 'Career assists'],
              ] as const
            ).map(([name, label]) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                <input type="number" step="any" {...register(name, { valueAsNumber: true })} className={inputClass} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-700">Coach name</label>
              <input {...register('coachName')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Coach email</label>
              <input type="email" {...register('coachEmail')} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Coach phone</label>
              <input {...register('coachPhone')} className={inputClass} />
            </div>
            <RecentMatchEditor state={recentMatchState} onChange={setRecentMatchState} />
          </div>
        </fieldset>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Achievements</label>
        {achievements.map((row, index) => (
          <div key={row.key} className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl border border-gray-200 p-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                value={row.title}
                onChange={(e) => {
                  const next = [...achievements];
                  next[index] = { ...row, title: e.target.value };
                  setAchievements(next);
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={row.achievementDate}
                onChange={(e) => {
                  const next = [...achievements];
                  next[index] = { ...row, achievementDate: e.target.value };
                  setAchievements(next);
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={row.category}
                onChange={(e) => {
                  const next = [...achievements];
                  next[index] = { ...row, category: e.target.value };
                  setAchievements(next);
                }}
                className={inputClass}
              >
                <option value="">Select a category</option>
                {row.category && !achievementOptions.some((option) => option.code === row.category) && (
                  <option value={row.category}>{row.category}</option>
                )}
                {achievementOptions.map((category) => (
                  <option key={category.id ?? category.code} value={category.code}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={row.description}
                rows={2}
                onChange={(e) => {
                  const next = [...achievements];
                  next[index] = { ...row, description: e.target.value };
                  setAchievements(next);
                }}
                className={inputClass}
              />
            </div>
            <button
              type="button"
              className="text-sm text-red-600 text-left"
              onClick={() => {
                if (row.id != null) setRemovedAchievementIds((prev) => [...prev, row.id as number]);
                setAchievements((prev) => prev.filter((item) => item.key !== row.key));
              }}
            >
              Remove achievement
            </button>
          </div>
        ))}
        <button type="button" className="text-sm text-blue-600" onClick={() => setAchievements((prev) => [...prev, emptyAchievement()])}>
          + Add achievement
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Skills / expertise</label>
        {expertiseItems.map((item, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              value={item}
              onChange={(e) => {
                const next = [...expertiseItems];
                next[i] = e.target.value;
                setExpertiseItems(next);
                setValue('expertise', next);
              }}
              className={inputClass}
            />
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-blue-600"
          onClick={() => setExpertiseItems((prev) => [...prev, ''])}
        >
          + Add skill
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Portrait image</label>
        <DragDropImageUpload
          selectedFile={imageFile}
          previewUrl={imagePreview}
          onFileSelect={(file) => {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
          }}
          onFileRemove={() => {
            setImageFile(null);
            setImagePreview(null);
          }}
        />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('isActive')} />
        <span className="text-sm">Active on roster</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-shrink-0 h-14 rounded-xl bg-rose-100 hover:bg-rose-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6 disabled:opacity-50"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-rose-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="font-semibold text-rose-700">
            {saving ? 'Saving…' : member?.id ? 'Update member' : 'Create member'}
          </span>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-shrink-0 h-14 rounded-xl bg-blue-100 hover:bg-blue-200 flex items-center justify-center gap-3 transition-all duration-300 hover:scale-105 px-6"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-200 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="font-semibold text-blue-700">Cancel</span>
        </button>
      </div>
    </form>
  );
}
