'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FOOTBALL_MATCH_STATS,
  MATCH_RESULTS,
  MATCH_STAT_PRESETS,
  SEASON_STAT_PRESETS,
  emptyMatch,
  emptySportProfile,
  type ExtraStatDraft,
  type LabeledField,
  type RecentMatchesState,
  type SportMatchDraft,
  type SportProfileDocument,
  type SportProfileDraft,
} from '@/lib/sportProfileForm';
import { FieldHint, HintMark } from './FieldHint';

const inputClass = 'mt-1 w-full border border-gray-400 rounded-xl px-4 py-3 text-base';

const FIELD_HINTS: Record<string, string> = {
  Position: 'Main role in this sport. Example: Point guard.',
  Secondary: 'Backup role. Example: Shooting guard. Leave blank if there is only one role.',
  Jersey: 'Shirt number for this sport. Whole number. Example: 7.',
  Season: 'Season name or year. Example: 2026 or Winter 2026.',
  Wins: 'Games won this season. Whole number. Example: 12.',
  Losses: 'Games lost this season. Whole number. Example: 4.',
  Draws: 'Games drawn this season. Whole number, or 0.',
  League: 'Competition or club name. Example: DMV Premier.',
  'Physical note': 'A short note on build or style. Example: 188 cm, left-handed.',
  'Career line': 'One sentence career summary. Example: Club captain since 2024.',
  Date: 'Match date from the calendar.',
  Kickoff: 'Start time as HH:MM. Example: 19:30.',
  Opponent: 'The other team or player. Example: FC United.',
  Competition: 'Tournament or league for this match. Example: State Cup.',
  'Home score': 'This club’s score. Whole number. Example: 2.',
  'Away score': 'The opponent’s score. Whole number. Example: 1.',
  Result: 'Choose WIN, LOSS, or DRAW.',
};

function hintFor(label: string): string {
  if (FIELD_HINTS[label]) return FIELD_HINTS[label];
  if (label.includes('%')) return 'Percent from 0 to 100. Decimals are allowed. Example: 84.5.';
  return 'Number for this season or match. Decimals are allowed. Leave blank if unknown.';
}

function filled(value: string | undefined | null): string {
  return (value ?? '').trim();
}

function present(lines: string[]): string[] {
  const kept = lines.map((line) => line.trim()).filter(Boolean);
  return kept.length ? kept : ['Not entered yet.'];
}

export interface DetailSection {
  heading: string;
  lines: string[];
}

export interface DetailGroup {
  title: string;
  sections: DetailSection[];
}

function matchLine(row: SportMatchDraft, statFields: LabeledField[]): string | null {
  const parts: string[] = [];
  if (filled(row.date)) parts.push(row.date);
  if (filled(row.kickoff)) parts.push(row.kickoff);
  if (filled(row.opponent)) parts.push(`vs ${row.opponent.trim()}`);
  if (filled(row.competition)) parts.push(row.competition.trim());
  if (filled(row.homeScore) || filled(row.awayScore)) {
    parts.push(`${filled(row.homeScore) || '–'}–${filled(row.awayScore) || '–'}`);
  }
  if (filled(row.result)) parts.push(row.result.trim());
  if (row.home) parts.push('Home');
  const numbers = [
    ...statFields
      .filter((field) => filled(row.stats[field.key]))
      .map((field) => `${field.label} ${row.stats[field.key].trim()}`),
    ...row.extraStats
      .filter((stat) => filled(stat.key) && filled(stat.value))
      .map((stat) => `${stat.key.trim()} ${stat.value.trim()}`),
  ];
  if (numbers.length) parts.push(numbers.join(', '));
  return parts.length ? parts.join(' · ') : null;
}

export function buildSportDetailGroup(sport: CheckedSport, draft: SportProfileDraft): DetailGroup {
  const seasonFields = SEASON_STAT_PRESETS[sport.code] ?? [];
  const matchFields = MATCH_STAT_PRESETS[sport.code] ?? [];
  const record = [
    filled(draft.wins) ? `${draft.wins.trim()} wins` : '',
    filled(draft.losses) ? `${draft.losses.trim()} losses` : '',
    filled(draft.draws) ? `${draft.draws.trim()} draws` : '',
  ]
    .filter(Boolean)
    .join(', ');
  const statLines = [
    ...seasonFields
      .filter((field) => filled(draft.stats[field.key]))
      .map((field) => `${field.label}: ${draft.stats[field.key].trim()}`),
    ...draft.extraStats
      .filter((stat) => filled(stat.key) && filled(stat.value))
      .map((stat) => `${stat.key.trim()}: ${stat.value.trim()}`),
  ];
  const matches = draft.matches
    .map((row) => matchLine(row, matchFields))
    .filter((line): line is string => Boolean(line));
  return {
    title: sport.label,
    sections: [
      {
        heading: 'Playing role',
        lines: present([
          filled(draft.position) ? `Position: ${draft.position.trim()}` : '',
          filled(draft.secondary) ? `Also plays: ${draft.secondary.trim()}` : '',
          filled(draft.jersey) ? `Jersey ${draft.jersey.trim()}` : '',
          filled(draft.physical) ? draft.physical.trim() : '',
        ]),
      },
      {
        heading: 'Season record',
        lines: present([
          filled(draft.seasonLabel) ? `Season ${draft.seasonLabel.trim()}` : '',
          record,
          filled(draft.league) ? `League: ${draft.league.trim()}` : '',
          filled(draft.careerLine) ? draft.careerLine.trim() : '',
        ]),
      },
      { heading: 'Season numbers', lines: present(statLines) },
      {
        heading: 'Skills',
        lines: present(draft.skills.map((skill) => skill.trim())),
      },
      { heading: 'Recent matches', lines: present(matches) },
    ],
  };
}

function textLine(label: string, value: string | number | null | undefined): string {
  if (value == null) return '';
  const text = String(value).trim();
  if (!text || text === 'NaN') return '';
  return `${label}: ${text}`;
}

export function buildFootballDetailGroup(input: {
  position?: string | null;
  jerseyNumber?: number | null;
  nationality?: string | null;
  preferredFoot?: string | null;
  heightCm?: number | null;
  seasonLabel?: string | null;
  seasonAppearances?: number | null;
  seasonGoals?: number | null;
  seasonAssists?: number | null;
  seasonMinutes?: number | null;
  seasonWins?: number | null;
  seasonDraws?: number | null;
  seasonLosses?: number | null;
  passAccuracyPct?: number | null;
  shotAccuracyPct?: number | null;
  topSpeedKmh?: number | null;
  careerAppearances?: number | null;
  careerGoals?: number | null;
  careerAssists?: number | null;
  coachName?: string | null;
  coachEmail?: string | null;
  coachPhone?: string | null;
  matches: SportMatchDraft[];
}): DetailGroup {
  const matches = input.matches
    .map((row) => matchLine(row, FOOTBALL_MATCH_STATS))
    .filter((line): line is string => Boolean(line));
  return {
    title: 'Football (Soccer)',
    sections: [
      {
        heading: 'Playing role',
        lines: present([
          textLine('Position', input.position),
          textLine('Jersey', input.jerseyNumber),
          textLine('Nationality', input.nationality),
          textLine(
            'Preferred foot',
            input.preferredFoot === 'LEFT'
              ? 'Left'
              : input.preferredFoot === 'RIGHT'
                ? 'Right'
                : input.preferredFoot === 'BOTH'
                  ? 'Both'
                  : input.preferredFoot
          ),
          textLine('Height (cm)', input.heightCm),
        ]),
      },
      {
        heading: 'This season',
        lines: present([
          textLine('Season', input.seasonLabel),
          textLine('Appearances', input.seasonAppearances),
          textLine('Goals', input.seasonGoals),
          textLine('Assists', input.seasonAssists),
          textLine('Minutes', input.seasonMinutes),
          textLine('Wins', input.seasonWins),
          textLine('Draws', input.seasonDraws),
          textLine('Losses', input.seasonLosses),
          textLine('Pass accuracy %', input.passAccuracyPct),
          textLine('Shot accuracy %', input.shotAccuracyPct),
          textLine('Top speed (km/h)', input.topSpeedKmh),
        ]),
      },
      {
        heading: 'Career',
        lines: present([
          textLine('Appearances', input.careerAppearances),
          textLine('Goals', input.careerGoals),
          textLine('Assists', input.careerAssists),
        ]),
      },
      {
        heading: 'Coach',
        lines: present([
          textLine('Name', input.coachName),
          textLine('Email', input.coachEmail),
          textLine('Phone', input.coachPhone),
        ]),
      },
      { heading: 'Recent matches', lines: present(matches) },
    ],
  };
}

export function SportDetailsDialog({
  groups,
  onClose,
}: {
  groups: DetailGroup[];
  onClose: () => void;
}) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-[10060] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sport details"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Entered details</h2>
            <p className="mt-1 text-sm text-gray-600">Each sport is its own section. Blank parts say “Not entered yet.”</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 h-10 rounded-xl bg-blue-100 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-200"
          >
            Close
          </button>
        </div>
        {groups.length === 0 ? (
          <p className="text-sm text-gray-600">Select at least one sport to see its details.</p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <section key={group.title} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-base font-semibold text-gray-900">{group.title}</h3>
                <div className="mt-3 space-y-3">
                  {group.sections.map((section) => (
                    <div key={section.heading}>
                      <h4 className="text-sm font-semibold text-blue-800">{section.heading}</h4>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-700">
                        {section.lines.map((line, index) => (
                          <li key={`${section.heading}-${index}`}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export interface CheckedSport {
  code: string;
  label: string;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <FieldHint label={label} hint={hint ?? hintFor(label)}>
      <input type={type} step={type === 'number' ? 'any' : undefined} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </FieldHint>
  );
}

function StatGrid({
  fields,
  stats,
  onChange,
}: {
  fields: LabeledField[];
  stats: Record<string, string>;
  onChange: (stats: Record<string, string>) => void;
}) {
  if (!fields.length) return null;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => (
        <Field
          key={field.key}
          label={field.label}
          type="number"
          value={stats[field.key] ?? ''}
          onChange={(value) => onChange({ ...stats, [field.key]: value })}
        />
      ))}
    </div>
  );
}

function ExtraStatRows({
  rows,
  onChange,
}: {
  rows: ExtraStatDraft[];
  onChange: (rows: ExtraStatDraft[]) => void;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div key={`${row.key}-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_8rem_auto]">
          <input
            value={row.key}
            onChange={(e) => {
              const next = [...rows];
              next[index] = { ...row, key: e.target.value };
              onChange(next);
            }}
            placeholder="Stat name"
            aria-label="Extra stat name"
            className={inputClass}
          />
          <input
            type="number"
            step="any"
            value={row.value}
            onChange={(e) => {
              const next = [...rows];
              next[index] = { ...row, value: e.target.value };
              onChange(next);
            }}
            placeholder="0"
            aria-label="Extra stat value"
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => onChange(rows.filter((_, i) => i !== index))}
            className="h-12 self-end rounded-xl bg-red-100 px-3 text-sm font-semibold text-red-700 hover:bg-red-200"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { key: '', value: '' }])}
        className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
      >
        Add stat
      </button>
    </div>
  );
}

function ResultSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const known = MATCH_RESULTS as readonly string[];
  const extra = value && !known.includes(value) ? [value] : [];
  return (
    <FieldHint label="Result" hint={hintFor('Result')}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">Not set</option>
        {extra.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
        {MATCH_RESULTS.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </FieldHint>
  );
}

function MatchRows({
  rows,
  statFields,
  showCompetition,
  onChange,
}: {
  rows: SportMatchDraft[];
  statFields: LabeledField[];
  showCompetition: boolean;
  onChange: (rows: SportMatchDraft[]) => void;
}) {
  const update = (index: number, patch: Partial<SportMatchDraft>) => {
    const next = [...rows];
    next[index] = { ...rows[index], ...patch };
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row.key} className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Match {index + 1}</p>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
              className="rounded-lg bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-200"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Date" type="date" value={row.date} onChange={(date) => update(index, { date })} />
            <Field label="Kickoff" value={row.kickoff} onChange={(kickoff) => update(index, { kickoff })} />
            <Field label="Opponent" value={row.opponent} onChange={(opponent) => update(index, { opponent })} />
            {showCompetition && (
              <Field label="Competition" value={row.competition} onChange={(competition) => update(index, { competition })} />
            )}
            <Field label="Home score" type="number" value={row.homeScore} onChange={(homeScore) => update(index, { homeScore })} />
            <Field label="Away score" type="number" value={row.awayScore} onChange={(awayScore) => update(index, { awayScore })} />
            <ResultSelect value={row.result} onChange={(result) => update(index, { result })} />
            <div className="flex items-center gap-3 pt-7">
              <label className="flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer">
                <span className="relative flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={row.home}
                    onChange={(e) => update(index, { home: e.target.checked })}
                    onClick={(e) => e.stopPropagation()}
                    className="custom-checkbox"
                  />
                  <span className="custom-checkbox-tick">
                    {row.home && (
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l5 5L19 7" />
                      </svg>
                    )}
                  </span>
                </span>
                <span className="select-none">Home match</span>
              </label>
              <HintMark text="Tick this when this club was the home side." />
            </div>
          </div>
          {statFields.length > 0 && (
            <div className="mt-3">
              <p className="mb-1 text-sm font-medium text-gray-700">Box score</p>
              <StatGrid fields={statFields} stats={row.stats} onChange={(stats) => update(index, { stats })} />
            </div>
          )}
          {(row.extraStats.length > 0 || statFields.length === 0) && (
            <div className="mt-3">
              <p className="mb-1 text-sm font-medium text-gray-700">Other match numbers</p>
              <ExtraStatRows rows={row.extraStats} onChange={(extraStats) => update(index, { extraStats })} />
            </div>
          )}
          {statFields.length > 0 && row.extraStats.length === 0 && (
            <button
              type="button"
              onClick={() => update(index, { extraStats: [{ key: '', value: '' }] })}
              className="mt-3 rounded-xl bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
            >
              Add match stat
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, emptyMatch(statFields)])}
        className="rounded-xl bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
      >
        Add match
      </button>
    </div>
  );
}

function ProfileCard({
  sport,
  draft,
  onChange,
}: {
  sport: CheckedSport;
  draft: SportProfileDraft;
  onChange: (draft: SportProfileDraft) => void;
}) {
  const seasonFields = SEASON_STAT_PRESETS[sport.code] ?? [];
  const matchFields = MATCH_STAT_PRESETS[sport.code] ?? [];
  const [showMore, setShowMore] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const set = (patch: Partial<SportProfileDraft>) => onChange({ ...draft, ...patch });
  return (
    <fieldset className="rounded-xl border border-gray-300 bg-white p-4">
      <legend className="px-2 text-sm font-semibold text-gray-900">{sport.label}</legend>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setViewOpen(true)}
          className="h-10 rounded-xl bg-green-100 px-4 text-sm font-semibold text-green-700 hover:bg-green-200"
        >
          View {sport.label}
        </button>
        <button
          type="button"
          onClick={() => setShowMore((open) => !open)}
          className="h-10 rounded-xl bg-amber-100 px-4 text-sm font-semibold text-amber-800 hover:bg-amber-200"
        >
          {showMore ? 'Hide additional details' : 'Show additional details'}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Field label="Position" value={draft.position} onChange={(position) => set({ position })} />
        <Field label="Secondary" value={draft.secondary} onChange={(secondary) => set({ secondary })} />
        <Field label="Jersey" value={draft.jersey} onChange={(jersey) => set({ jersey })} />
        <Field label="Season" value={draft.seasonLabel} onChange={(seasonLabel) => set({ seasonLabel })} />
        <Field label="Wins" type="number" value={draft.wins} onChange={(wins) => set({ wins })} />
        <Field label="Losses" type="number" value={draft.losses} onChange={(losses) => set({ losses })} />
        <Field label="Draws" type="number" value={draft.draws} onChange={(draws) => set({ draws })} />
        <div className="md:col-span-2">
          <Field label="League" value={draft.league} onChange={(league) => set({ league })} />
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm font-medium text-gray-700">Season stats</p>
          <HintMark text="Numbers for this season only. Use the ! on each box for the expected format. Leave a box blank when you do not have the number." />
        </div>
        <StatGrid fields={seasonFields} stats={draft.stats} onChange={(stats) => set({ stats })} />
      </div>
      {showMore && (
        <>
      <div className="mt-4 grid grid-cols-1 gap-3">
        <Field label="Physical note" value={draft.physical} onChange={(physical) => set({ physical })} />
        <Field label="Career line" value={draft.careerLine} onChange={(careerLine) => set({ careerLine })} />
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm font-medium text-gray-700">Skills</p>
          <HintMark text="One skill per line. Example: Serve, Backhand. Leave a line blank and it is ignored." />
        </div>
        <div className="space-y-2">
          {draft.skills.map((skill, index) => (
            <div key={`${sport.code}-skill-${index}`} className="flex gap-2">
              <input
                value={skill}
                onChange={(e) => {
                  const skills = [...draft.skills];
                  skills[index] = e.target.value;
                  set({ skills });
                }}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => set({ skills: draft.skills.filter((_, i) => i !== index) })}
                className="h-12 self-end rounded-xl bg-red-100 px-3 text-sm font-semibold text-red-700 hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set({ skills: [...draft.skills, ''] })}
            className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
          >
            Add skill
          </button>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm font-medium text-gray-700">Extra season numbers</p>
          <HintMark text="Name the stat, then enter a number. Example: Aces, 14." />
        </div>
        {(draft.extraStats.length > 0 || seasonFields.length === 0) && (
          <ExtraStatRows rows={draft.extraStats} onChange={(extraStats) => set({ extraStats })} />
        )}
        {seasonFields.length > 0 && draft.extraStats.length === 0 && (
          <button
            type="button"
            onClick={() => set({ extraStats: [{ key: '', value: '' }] })}
            className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
          >
            Add season stat
          </button>
        )}
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2">
          <p className="text-sm font-medium text-gray-700">Recent matches</p>
          <HintMark text="One row per match. Date from the calendar, kickoff as HH:MM, scores as whole numbers." />
        </div>
        <MatchRows
          rows={draft.matches}
          statFields={matchFields}
          showCompetition={false}
          onChange={(matches) => set({ matches })}
        />
      </div>
        </>
      )}
      {viewOpen && (
        <SportDetailsDialog groups={[buildSportDetailGroup(sport, draft)]} onClose={() => setViewOpen(false)} />
      )}
    </fieldset>
  );
}

export function SportProfileCards({
  sports,
  profileDocument,
  onChange,
}: {
  sports: CheckedSport[];
  profileDocument: SportProfileDocument;
  onChange: (document: SportProfileDocument) => void;
}) {
  if (!sports.length) return null;
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">Sport profiles</h3>
      {sports.map((sport) => {
        const profile = profileDocument.profiles[sport.code] ?? emptySportProfile(sport.code);
        return (
          <ProfileCard
            key={sport.code}
            sport={sport}
            draft={profile}
            onChange={(next) =>
              onChange({
                ...profileDocument,
                profiles: { ...profileDocument.profiles, [sport.code]: next },
              })
            }
          />
        );
      })}
    </div>
  );
}

export function RecentMatchEditor({
  state,
  onChange,
}: {
  state: RecentMatchesState;
  onChange: (state: RecentMatchesState) => void;
}) {
  return (
    <div className="md:col-span-3">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-sm font-medium text-gray-700">Recent matches</p>
        <HintMark text="Football matches only. Date from the calendar, kickoff as HH:MM, scores as whole numbers. Tick Home when this club played at home." />
      </div>
      {state.legacyText && state.rows.length === 0 && (
        <p className="mb-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Existing notes are kept until you add a match row.
        </p>
      )}
      <MatchRows
        rows={state.rows}
        statFields={FOOTBALL_MATCH_STATS}
        showCompetition
        onChange={(rows) => onChange({ ...state, rows })}
      />
    </div>
  );
}
