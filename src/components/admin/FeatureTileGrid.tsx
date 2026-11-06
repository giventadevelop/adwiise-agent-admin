'use client';

import Link from 'next/link';
import { useId, useState, type ReactNode } from 'react';

export type FeatureTile = {
  key: string;
  href: string;
  label: string;
  summary: string;
  hint: string;
  searchTerms?: string[];
  guide?: string;
  icon: ReactNode;
  cardClassName: string;
  iconWrapClassName: string;
  active?: boolean;
};

const TONE_CARD: Record<string, string> = {
  blue: 'bg-blue-50 hover:bg-blue-100 text-blue-800',
  indigo: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800',
  green: 'bg-green-50 hover:bg-green-100 text-green-800',
  yellow: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-800',
  purple: 'bg-purple-50 hover:bg-purple-100 text-purple-800',
  orange: 'bg-orange-50 hover:bg-orange-100 text-orange-800',
  teal: 'bg-teal-50 hover:bg-teal-100 text-teal-800',
  cyan: 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800',
  pink: 'bg-pink-50 hover:bg-pink-100 text-pink-800',
  emerald: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800',
  lime: 'bg-lime-50 hover:bg-lime-100 text-lime-800',
  red: 'bg-red-50 hover:bg-red-100 text-red-800',
  amber: 'bg-amber-50 hover:bg-amber-100 text-amber-800',
  rose: 'bg-rose-50 hover:bg-rose-100 text-rose-800',
  violet: 'bg-violet-50 hover:bg-violet-100 text-violet-800',
  fuchsia: 'bg-fuchsia-50 hover:bg-fuchsia-100 text-fuchsia-800',
  sky: 'bg-sky-50 hover:bg-sky-100 text-sky-800',
};

const TONE_ICON: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-500',
  indigo: 'bg-indigo-100 text-indigo-500',
  green: 'bg-green-100 text-green-500',
  yellow: 'bg-yellow-100 text-yellow-500',
  purple: 'bg-purple-100 text-purple-500',
  orange: 'bg-orange-100 text-orange-500',
  teal: 'bg-teal-100 text-teal-500',
  cyan: 'bg-cyan-100 text-cyan-500',
  pink: 'bg-pink-100 text-pink-500',
  emerald: 'bg-emerald-100 text-emerald-500',
  lime: 'bg-lime-100 text-lime-600',
  red: 'bg-red-100 text-red-500',
  amber: 'bg-amber-100 text-amber-500',
  rose: 'bg-rose-100 text-rose-500',
  violet: 'bg-violet-100 text-violet-500',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-500',
  sky: 'bg-sky-100 text-sky-500',
};

export function toneCardClass(tone: string) {
  return TONE_CARD[tone] || TONE_CARD.blue;
}

export function toneIconClass(tone: string) {
  return TONE_ICON[tone] || TONE_ICON.blue;
}

/**
 * Casual synonyms → words that appear on sports / retail / event tiles.
 * Keeps metadata on each tile shorter while still matching everyday search terms.
 */
const QUERY_EXPANSIONS: Record<string, string[]> = {
  // Prefer sport-specific phrases so "soccer" does not hit every tile that says "team".
  soccer: ['soccer', 'football', 'sports team', 'sports', 'squad', 'tournament', 'cup'],
  football: ['football', 'soccer', 'sports team', 'sports', 'squad', 'tournament', 'cup'],
  futbol: ['futbol', 'soccer', 'football', 'sports team', 'sports', 'squad'],
  cricket: ['cricket', 'sports team', 'sports', 'squad', 'tournament'],
  hockey: ['hockey', 'sports team', 'sports', 'squad', 'tournament'],
  basketball: ['basketball', 'sports team', 'sports', 'squad', 'tournament'],
  baseball: ['baseball', 'sports team', 'sports', 'squad', 'tournament'],
  tennis: ['tennis', 'sports team', 'sports', 'squad', 'tournament'],
  athletics: ['athletics', 'sports team', 'sports', 'squad', 'tournament'],
  sport: ['sport', 'sports', 'sports team', 'squad', 'tournament'],
  sports: ['sports', 'sports team', 'squad', 'tournament', 'band'],
  player: ['player', 'players', 'squad', 'sports'],
  players: ['players', 'player', 'squad', 'sports'],
  tournament: ['tournament', 'cup', 'season', 'sports team', 'sports'],
  gas: ['gas', 'gas station', 'retail', 'shop', 'store', 'fuel'],
  petrol: ['petrol', 'gas station', 'retail', 'fuel', 'shop'],
  liquor: ['liquor', 'retail', 'shop', 'store'],
  store: ['store', 'shop', 'retail', 'gas station'],
  shop: ['shop', 'store', 'retail', 'gas station'],
};

function tokenMatchesHaystack(token: string, haystack: string): boolean {
  if (haystack.includes(token)) return true;
  const expansions = QUERY_EXPANSIONS[token];
  if (!expansions) return false;
  return expansions.some(term => haystack.includes(term));
}

export function tileMatchesSearch(
  tile: { label: string; hint: string; summary: string; searchTerms?: string[] },
  query: string,
) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [tile.label, tile.hint, tile.summary, ...(tile.searchTerms || [])].join(' ').toLowerCase();
  if (haystack.includes(q)) return true;
  const tokens = q.split(/\s+/).filter(Boolean);
  // Every typed word must match (directly or via synonym expansion).
  return tokens.every(token => tokenMatchesHaystack(token, haystack));
}

export default function FeatureTileGrid({
  tiles,
  dimmed = false,
  searchLabel = 'Search features by name or related words, such as retail, soccer, sports team, or gas station.',
}: {
  tiles: FeatureTile[];
  dimmed?: boolean;
  searchLabel?: string;
}) {
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [cursorTip, setCursorTip] = useState<{ text: string; x: number; y: number } | null>(null);
  const visible = tiles.filter((tile) => tileMatchesSearch(tile, query));

  function moveCursorTip(text: string, event: { clientX: number; clientY: number }) {
    const offset = 16;
    const width = 320;
    const height = Math.min(240, 56 + Math.ceil(text.length / 48) * 20);
    let x = event.clientX + offset;
    let y = event.clientY + offset;
    if (typeof window !== 'undefined') {
      if (x + width > window.innerWidth - 8) x = Math.max(8, event.clientX - width - 8);
      if (y + height > window.innerHeight - 8) y = Math.max(8, event.clientY - height - 8);
    }
    setCursorTip({ text, x, y });
  }

  return (
    <div className="w-full mb-8">
      <div className="relative max-w-xl mx-auto mb-6">
        <div className="mb-3 rounded-xl border-2 border-indigo-300 bg-indigo-50 px-4 py-3 text-center shadow-sm">
          <p className="text-sm sm:text-base font-bold text-indigo-900 leading-snug">{searchLabel}</p>
        </div>
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id={searchId}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search features…"
            title="Search features"
            aria-label="Search features"
            className={`box-border block w-full h-12 border rounded-xl focus:ring-blue-500 focus:border-blue-500 pl-10 pr-10 text-base ${
              query.trim() ? 'border-blue-500 bg-blue-50' : 'border-gray-400 bg-white'
            }`}
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1.5 text-gray-400 hover:text-gray-700"
              title="Clear search"
              aria-label="Clear feature search"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      <div className={dimmed ? 'pointer-events-none opacity-40' : ''}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((tile) => {
            const guide = tile.guide || tile.hint;
            return (
              <Link
                key={tile.key}
                href={tile.href}
                aria-label={`${tile.label}: ${tile.hint}`}
                aria-current={tile.active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center rounded-lg shadow-md p-5 text-sm transition-all group ${tile.cardClassName} ${
                  tile.active ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                }`}
                onMouseEnter={(event) => moveCursorTip(tile.hint, event)}
                onMouseMove={(event) => moveCursorTip(tile.hint, event)}
                onMouseLeave={() => setCursorTip(null)}
                onFocus={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  moveCursorTip(tile.hint, {
                    clientX: rect.left + rect.width / 2,
                    clientY: rect.top + rect.height / 2,
                  });
                }}
                onBlur={() => setCursorTip(null)}
              >
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Guide for ${tile.label}`}
                  className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-sky-400 text-sm font-bold text-sky-500 hover:border-sky-500 hover:text-sky-600"
                  onMouseEnter={(event) => {
                    event.stopPropagation();
                    moveCursorTip(guide, event);
                  }}
                  onMouseMove={(event) => {
                    event.stopPropagation();
                    moveCursorTip(guide, event);
                  }}
                  onMouseLeave={(event) => {
                    event.stopPropagation();
                    setCursorTip(null);
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                >
                  ?
                </span>
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 ${tile.iconWrapClassName}`}>
                  {tile.icon}
                </div>
                <span className="font-semibold text-center leading-tight">{tile.label}</span>
                <span className="mt-2 text-center text-sm sm:text-base font-medium leading-snug text-slate-600">[{tile.summary}]</span>
              </Link>
            );
          })}
        </div>
        {visible.length === 0 && (
          <div className="mt-4 rounded-lg border-2 border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800 text-center">
            No features match your search.
          </div>
        )}
      </div>

      {cursorTip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[80] max-w-[320px] rounded-xl border border-white/20 bg-gradient-to-b from-indigo-800 to-indigo-950 px-3 py-2 text-left text-xs font-semibold leading-snug tracking-wide text-indigo-50 shadow-[0_10px_24px_rgba(49,46,129,0.32)]"
          style={{ left: cursorTip.x, top: cursorTip.y }}
        >
          {cursorTip.text}
        </div>
      )}
    </div>
  );
}
