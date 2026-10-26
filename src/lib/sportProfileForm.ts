/**
 * Reads and writes team_members.sport_profiles without changing the stored shape.
 * Categories stay a code list. Each other object is one sport profile.
 * Football season totals stay on team_members columns, not in this document.
 */

export const FOOTBALL_CODE = 'football';

export interface LabeledField {
  key: string;
  label: string;
}

export const SEASON_STAT_PRESETS: Record<string, LabeledField[]> = {
  badminton: [
    { key: 'points', label: 'Points' },
    { key: 'winners', label: 'Winners' },
    { key: 'smashes', label: 'Smashes' },
    { key: 'netPoints', label: 'Net points' },
    { key: 'rallyWinPct', label: 'Rally win %' },
    { key: 'errors', label: 'Errors' },
  ],
  basketball: [
    { key: 'points', label: 'Points' },
    { key: 'rebounds', label: 'Rebounds' },
    { key: 'assists', label: 'Assists' },
    { key: 'steals', label: 'Steals' },
    { key: 'fieldGoalPct', label: 'Field goal %' },
    { key: 'threePointPct', label: 'Three-point %' },
  ],
  cricket: [
    { key: 'runs', label: 'Runs' },
    { key: 'wickets', label: 'Wickets' },
    { key: 'catches', label: 'Catches' },
    { key: 'average', label: 'Average' },
    { key: 'strikeRate', label: 'Strike rate' },
    { key: 'economy', label: 'Economy' },
  ],
  golf: [
    { key: 'rounds', label: 'Rounds' },
    { key: 'birdies', label: 'Birdies' },
    { key: 'pars', label: 'Pars' },
    { key: 'eagles', label: 'Eagles' },
    { key: 'fairwayPct', label: 'Fairway %' },
    { key: 'girPct', label: 'Greens in regulation %' },
  ],
  'table-tennis': [
    { key: 'wins', label: 'Wins' },
    { key: 'losses', label: 'Losses' },
    { key: 'points', label: 'Points' },
    { key: 'winners', label: 'Winners' },
  ],
  'tennis-squash': [
    { key: 'wins', label: 'Wins' },
    { key: 'losses', label: 'Losses' },
    { key: 'aces', label: 'Aces' },
    { key: 'winners', label: 'Winners' },
    { key: 'firstServePct', label: 'First serve %' },
    { key: 'winPct', label: 'Win %' },
  ],
  volleyball: [
    { key: 'kills', label: 'Kills' },
    { key: 'aces', label: 'Aces' },
    { key: 'blocks', label: 'Blocks' },
    { key: 'digs', label: 'Digs' },
    { key: 'attackPct', label: 'Attack %' },
    { key: 'servePct', label: 'Serve %' },
  ],
};

export const MATCH_STAT_PRESETS: Record<string, LabeledField[]> = {
  badminton: [
    { key: 'points', label: 'Points' },
    { key: 'winners', label: 'Winners' },
    { key: 'smashes', label: 'Smashes' },
    { key: 'errors', label: 'Errors' },
  ],
  basketball: [
    { key: 'points', label: 'Points' },
    { key: 'rebounds', label: 'Rebounds' },
    { key: 'assists', label: 'Assists' },
    { key: 'steals', label: 'Steals' },
  ],
  cricket: [
    { key: 'runs', label: 'Runs' },
    { key: 'wickets', label: 'Wickets' },
    { key: 'catches', label: 'Catches' },
    { key: 'economy', label: 'Economy' },
  ],
  golf: [
    { key: 'score', label: 'Score' },
    { key: 'birdies', label: 'Birdies' },
    { key: 'pars', label: 'Pars' },
    { key: 'eagles', label: 'Eagles' },
  ],
  'table-tennis': [
    { key: 'points', label: 'Points' },
    { key: 'winners', label: 'Winners' },
    { key: 'wins', label: 'Wins' },
    { key: 'losses', label: 'Losses' },
  ],
  'tennis-squash': [
    { key: 'aces', label: 'Aces' },
    { key: 'winners', label: 'Winners' },
    { key: 'wins', label: 'Wins' },
    { key: 'losses', label: 'Losses' },
  ],
  volleyball: [
    { key: 'kills', label: 'Kills' },
    { key: 'aces', label: 'Aces' },
    { key: 'blocks', label: 'Blocks' },
    { key: 'digs', label: 'Digs' },
  ],
};

/** Box score on team_members.recent_matches (football), not inside sport_profiles. */
export const FOOTBALL_MATCH_STATS: LabeledField[] = [
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'passAccuracy', label: 'Pass accuracy %' },
];

export const MATCH_RESULTS = ['WIN', 'LOSS', 'DRAW'] as const;

const PROFILE_FIELDS = [
  'position',
  'secondary',
  'jersey',
  'seasonLabel',
  'wins',
  'losses',
  'draws',
  'league',
  'physical',
  'careerLine',
  'skills',
  'stats',
  'matches',
] as const;

const MATCH_FIELDS = ['date', 'kickoff', 'opponent', 'competition', 'home', 'homeScore', 'awayScore', 'result'] as const;

export interface ExtraStatDraft {
  key: string;
  value: string;
}

export interface SportMatchDraft {
  key: string;
  date: string;
  kickoff: string;
  opponent: string;
  competition: string;
  home: boolean;
  homeScore: string;
  awayScore: string;
  result: string;
  stats: Record<string, string>;
  extraStats: ExtraStatDraft[];
  extra: Record<string, unknown>;
}

export interface SportProfileDraft {
  position: string;
  secondary: string;
  jersey: string;
  seasonLabel: string;
  wins: string;
  losses: string;
  draws: string;
  league: string;
  physical: string;
  careerLine: string;
  skills: string[];
  stats: Record<string, string>;
  extraStats: ExtraStatDraft[];
  matches: SportMatchDraft[];
  extra: Record<string, unknown>;
}

export interface SportProfileDocument {
  profiles: Record<string, SportProfileDraft>;
  extras: Record<string, unknown>;
}

export interface RecentMatchesState {
  rows: SportMatchDraft[];
  /** Original text when it was not a JSON array. Kept only while every row stays empty. */
  legacyText: string | null;
}

let draftSeq = 0;

function nextKey(prefix: string): string {
  draftSeq += 1;
  return `${prefix}-${draftSeq}`;
}

function asText(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function trimmed(value: string): string {
  return value.trim();
}

function finiteNumber(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function emptySportProfile(code?: string): SportProfileDraft {
  const stats: Record<string, string> = {};
  for (const field of SEASON_STAT_PRESETS[code ?? ''] ?? []) {
    stats[field.key] = '';
  }
  return {
    position: '',
    secondary: '',
    jersey: '',
    seasonLabel: '',
    wins: '',
    losses: '',
    draws: '',
    league: '',
    physical: '',
    careerLine: '',
    skills: [''],
    stats,
    extraStats: [],
    matches: [],
    extra: {},
  };
}

export function emptyMatch(statFields: LabeledField[] = []): SportMatchDraft {
  const stats: Record<string, string> = {};
  for (const field of statFields) stats[field.key] = '';
  return {
    key: nextKey('match'),
    date: '',
    kickoff: '',
    opponent: '',
    competition: '',
    home: false,
    homeScore: '',
    awayScore: '',
    result: '',
    stats,
    extraStats: [],
    extra: {},
  };
}

function splitStats(
  raw: unknown,
  presets: LabeledField[]
): { stats: Record<string, string>; extraStats: ExtraStatDraft[] } {
  const presetKeys = new Set(presets.map((field) => field.key));
  const stats: Record<string, string> = {};
  for (const field of presets) stats[field.key] = '';
  const extraStats: ExtraStatDraft[] = [];
  if (!isPlainObject(raw)) return { stats, extraStats };
  for (const [key, value] of Object.entries(raw)) {
    const text = asText(value);
    if (presetKeys.has(key)) stats[key] = text;
    else extraStats.push({ key, value: text });
  }
  return { stats, extraStats };
}

function matchFromJson(raw: unknown, statFields: LabeledField[]): SportMatchDraft | null {
  if (!isPlainObject(raw)) return null;
  const presetKeys = new Set(statFields.map((field) => field.key));
  const reserved = new Set<string>(MATCH_FIELDS);
  const stats: Record<string, string> = {};
  for (const field of statFields) stats[field.key] = asText(raw[field.key]);
  const extraStats: ExtraStatDraft[] = [];
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (reserved.has(key) || presetKeys.has(key)) continue;
    const text = asText(value);
    const numeric = typeof value === 'number' || (text.trim() !== '' && Number.isFinite(Number(text)));
    if (numeric) extraStats.push({ key, value: text });
    else extra[key] = value;
  }
  return {
    key: nextKey('match'),
    date: asText(raw.date).slice(0, 10),
    kickoff: asText(raw.kickoff),
    opponent: asText(raw.opponent),
    competition: asText(raw.competition),
    home: raw.home === true,
    homeScore: asText(raw.homeScore),
    awayScore: asText(raw.awayScore),
    result: asText(raw.result),
    stats,
    extraStats,
    extra,
  };
}

function profileFromJson(code: string, raw: unknown): SportProfileDraft {
  const blank = emptySportProfile(code);
  if (!isPlainObject(raw)) return blank;
  const season = splitStats(raw.stats, SEASON_STAT_PRESETS[code] ?? []);
  const known = new Set<string>(PROFILE_FIELDS);
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!known.has(key)) extra[key] = value;
  }
  const skills = Array.isArray(raw.skills) ? raw.skills.map((item) => asText(item)) : [];
  const matchFields = MATCH_STAT_PRESETS[code] ?? [];
  const matches = Array.isArray(raw.matches)
    ? raw.matches.map((row) => matchFromJson(row, matchFields)).filter((row): row is SportMatchDraft => row != null)
    : [];
  return {
    position: asText(raw.position),
    secondary: asText(raw.secondary),
    jersey: asText(raw.jersey),
    seasonLabel: asText(raw.seasonLabel),
    wins: asText(raw.wins),
    losses: asText(raw.losses),
    draws: asText(raw.draws),
    league: asText(raw.league),
    physical: asText(raw.physical),
    careerLine: asText(raw.careerLine),
    skills: skills.length ? skills : [''],
    stats: season.stats,
    extraStats: season.extraStats,
    matches,
    extra,
  };
}

export function parseSportProfiles(raw?: string | null): SportProfileDocument {
  if (!raw?.trim()) return { profiles: {}, extras: {} };
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isPlainObject(value)) return { profiles: {}, extras: {} };
    const profiles: Record<string, SportProfileDraft> = {};
    const extras: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'categories') continue;
      if (isPlainObject(entry)) profiles[key] = profileFromJson(key, entry);
      else extras[key] = entry;
    }
    return { profiles, extras };
  } catch {
    return { profiles: {}, extras: {} };
  }
}

function putString(target: Record<string, unknown>, key: string, value: string): void {
  const text = trimmed(value);
  if (text) target[key] = text;
}

function putNumber(target: Record<string, unknown>, key: string, value: string): void {
  const n = finiteNumber(value);
  if (n != null) target[key] = n;
}

function statsToJson(stats: Record<string, string>, extraStats: ExtraStatDraft[]): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(stats)) {
    const n = finiteNumber(value);
    if (n != null) out[key] = n;
  }
  for (const row of extraStats) {
    const key = trimmed(row.key);
    const n = finiteNumber(row.value);
    if (key && n != null) out[key] = n;
  }
  return Object.keys(out).length ? out : null;
}

function matchToJson(row: SportMatchDraft): Record<string, unknown> | null {
  const out: Record<string, unknown> = { ...row.extra };
  putString(out, 'date', row.date);
  putString(out, 'kickoff', row.kickoff);
  putString(out, 'opponent', row.opponent);
  putString(out, 'competition', row.competition);
  putNumber(out, 'homeScore', row.homeScore);
  putNumber(out, 'awayScore', row.awayScore);
  putString(out, 'result', row.result);
  const box = statsToJson(row.stats, row.extraStats);
  if (box) Object.assign(out, box);
  const hasContent =
    Object.keys(out).length > 0 ||
    row.extraStats.some((stat) => trimmed(stat.key) || trimmed(stat.value));
  if (!hasContent) return null;
  out.home = row.home;
  return out;
}

function profileToJson(draft: SportProfileDraft): Record<string, unknown> {
  const out: Record<string, unknown> = { ...draft.extra };
  putString(out, 'position', draft.position);
  putString(out, 'secondary', draft.secondary);
  putString(out, 'jersey', draft.jersey);
  putString(out, 'seasonLabel', draft.seasonLabel);
  putNumber(out, 'wins', draft.wins);
  putNumber(out, 'losses', draft.losses);
  putNumber(out, 'draws', draft.draws);
  putString(out, 'league', draft.league);
  putString(out, 'physical', draft.physical);
  putString(out, 'careerLine', draft.careerLine);
  const skills = draft.skills.map((skill) => trimmed(skill)).filter(Boolean);
  if (skills.length) out.skills = skills;
  const stats = statsToJson(draft.stats, draft.extraStats);
  if (stats) out.stats = stats;
  const matches = draft.matches.map(matchToJson).filter((row): row is Record<string, unknown> => row != null);
  if (matches.length) out.matches = matches;
  return out;
}

/** Rebuilds the sport_profiles document for the sports currently checked. */
export function serializeSportProfiles(doc: SportProfileDocument, categoryCodes: string[]): string {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc.extras)) {
    if (key !== 'categories') out[key] = value;
  }
  for (const code of categoryCodes) {
    if (!code || code === FOOTBALL_CODE) continue;
    out[code] = profileToJson(doc.profiles[code] ?? emptySportProfile(code));
  }
  out.categories = categoryCodes.filter((code) => !!code && code !== '');
  return JSON.stringify(out);
}

export function parseRecentMatches(raw?: string | null): RecentMatchesState {
  if (!raw?.trim()) return { rows: [], legacyText: null };
  try {
    const value = JSON.parse(raw) as unknown;
    if (Array.isArray(value)) {
      return {
        rows: value
          .map((row) => matchFromJson(row, FOOTBALL_MATCH_STATS))
          .filter((row): row is SportMatchDraft => row != null),
        legacyText: null,
      };
    }
  } catch {
    return { rows: [], legacyText: raw };
  }
  return { rows: [], legacyText: raw };
}

export function serializeRecentMatches(state: RecentMatchesState): string | null {
  const rows = state.rows.map(matchToJson).filter((row): row is Record<string, unknown> => row != null);
  if (!rows.length) {
    const legacy = state.legacyText?.trim();
    return legacy || null;
  }
  return JSON.stringify(rows);
}
