'use client';

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

const inputClass = 'mt-1 w-full border border-gray-400 rounded-xl px-4 py-3 text-base';

export interface CheckedSport {
  code: string;
  label: string;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input type={type} step={type === 'number' ? 'any' : undefined} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} />
    </div>
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
    <div>
      <label className="block text-sm font-medium text-gray-700">Result</label>
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
    </div>
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
            <label className="flex items-center gap-2 pt-7 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={row.home}
                onChange={(e) => update(index, { home: e.target.checked })}
                className="h-4 w-4 rounded border-gray-400 text-blue-600 focus:ring-blue-500"
              />
              Home match
            </label>
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
  const set = (patch: Partial<SportProfileDraft>) => onChange({ ...draft, ...patch });
  return (
    <fieldset className="rounded-xl border border-gray-300 bg-white p-4">
      <legend className="px-2 text-sm font-semibold text-gray-900">{sport.label}</legend>
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
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700">Physical note</label>
          <input value={draft.physical} onChange={(e) => set({ physical: e.target.value })} className={inputClass} />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700">Career line</label>
          <input value={draft.careerLine} onChange={(e) => set({ careerLine: e.target.value })} className={inputClass} />
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Skills</p>
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
        <p className="mb-2 text-sm font-medium text-gray-700">Season stats</p>
        <StatGrid fields={seasonFields} stats={draft.stats} onChange={(stats) => set({ stats })} />
        {(draft.extraStats.length > 0 || seasonFields.length === 0) && (
          <div className="mt-3">
            <ExtraStatRows rows={draft.extraStats} onChange={(extraStats) => set({ extraStats })} />
          </div>
        )}
        {seasonFields.length > 0 && draft.extraStats.length === 0 && (
          <button
            type="button"
            onClick={() => set({ extraStats: [{ key: '', value: '' }] })}
            className="mt-3 rounded-xl bg-blue-100 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-200"
          >
            Add season stat
          </button>
        )}
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-gray-700">Recent matches</p>
        <MatchRows
          rows={draft.matches}
          statFields={matchFields}
          showCompetition={false}
          onChange={(matches) => set({ matches })}
        />
      </div>
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
      <p className="mb-2 text-sm font-medium text-gray-700">Recent matches</p>
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
