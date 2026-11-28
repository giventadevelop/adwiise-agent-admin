'use client';

import { Fragment, useState } from 'react';

const OWN_DOMAIN = 'On the organization\u2019s own domain';

const typeDefs = [
  { id: 'community', label: 'Community and cultural', desc: 'Events, sponsors, galleries.', domain: 'keralacenter.org', pub: 'Kerala Center', tiles: ['Events', 'Sponsors', 'Galleries'] },
  { id: 'events', label: 'Event organization', desc: 'Events, calendar, gallery, sponsors.', domain: 'mcefee-temp.com', pub: 'MCEFEE', tiles: ['Events', 'Calendar', 'Gallery', 'Sponsors'] },
  { id: 'church', label: 'Church', desc: 'Events plus leadership.', domain: OWN_DOMAIN, pub: 'Church site', tiles: ['Events', 'Leadership'] },
  { id: 'sports', label: 'Sports team', desc: 'Roster, leagues, tournaments.', domain: 'md-strikers.com', pub: 'MD Strikers', tiles: ['Roster', 'Leagues', 'Tournaments'] },
  { id: 'music', label: 'Music', desc: 'Its own pages and admin tiles.', domain: OWN_DOMAIN, pub: 'Music site', tiles: ['Music pages', 'Music admin tiles'] },
  { id: 'school', label: 'School', desc: 'Staff, departments, news, fee invoices.', domain: 'bst-school-demo.com', pub: 'School template', tiles: ['Staff', 'Departments', 'News', 'Fee invoices'] },
  { id: 'profile', label: 'Personal and hybrid profile', desc: 'Profile-first public sites.', domain: OWN_DOMAIN, pub: 'Profile site', tiles: ['Profile'] },
  { id: 'retail', label: 'Retail and shop packs', desc: 'Gas station, liquor, restaurant, clinic. Operator dashboard.', domain: OWN_DOMAIN, pub: 'Shop site', tiles: ['Operator dashboard'] },
];

const TILE_TINTS: [string, string][] = [
  ['#19E6FF', 'rgba(25,230,255,0.7)'],
  ['#FF8AD0', 'rgba(255,61,166,0.55)'],
  ['#9D8CFF', 'rgba(157,140,255,0.7)'],
  ['#5FD0FF', 'rgba(95,208,255,0.7)'],
];
const SOFT = ['#D6FBFF', '#FFE3F3', '#EFEAFF', '#E3F0FF'];
const NEON = ['#19E6FF', '#FF8AD0', '#9D8CFF', '#5FD0FF'];

/** Site-type picker: shows which admin tiles and public site a tenant of that type gets. */
export default function SiteTypeSwitch() {
  const [current, setCurrent] = useState('community');

  const types = typeDefs.map((def) => {
    const on = def.id === current;
    return {
      label: def.label,
      on,
      bg: on ? '#19E6FF' : '#FFFFFF',
      fg: '#15132E',
      bd: on ? '#19E6FF' : '#FFFFFF',
      sh: on ? '4px 4px 0 #FFE14D' : 'none',
      pick: () => setCurrent(def.id),
    };
  });

  const index = Math.max(0, typeDefs.findIndex((def) => def.id === current));
  const def = typeDefs[index];
  const sel = {
    label: def.label,
    desc: def.desc,
    domain: def.domain,
    pub: def.pub,
    soft: SOFT[index % 4],
    neon: NEON[index % 4],
    tiles: def.tiles.map((name, i) => ({ name, tint: TILE_TINTS[i % 4][0], glow: TILE_TINTS[i % 4][1] })),
  };

  return (
    <>
{/* SITE TYPES SWITCH */}
<section id="site-types" style={{ padding: "72px 0 24px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "720px" }}>
<span style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#19E6FF" }}>Site types</span>
<h2 style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(30px, 3.6vw, 46px)", lineHeight: "1.08", letterSpacing: "-0.025em", color: "#FFFFFF" }}>Site types from one switch.</h2>
<p style={{ margin: "0", fontSize: "18px", color: "#DDD7F7" }}>The site type decides which admin tiles appear. Pick one to see what staff get.</p>
</div>

<div role="group" aria-label="Site type" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
{types.map((t) => (
<Fragment key={t.label}>
<button type="button" onClick={t.pick} aria-pressed={t.on} style={{ minHeight: "44px", padding: "0 18px", borderRadius: "999px", border: `1.5px solid ${t.bd}`, background: t.bg, color: t.fg, boxShadow: t.sh, fontFamily: "inherit", fontSize: "15px", fontWeight: "700", cursor: "pointer" }}>{t.label}</button>
</Fragment>
))}
</div>

<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", alignItems: "stretch" }}>
{/* admin dashboard mock */}
<div style={{ background: "#E6DEFF", border: "1px solid #E2E7EF", borderRadius: "24px", padding: "26px", display: "flex", flexDirection: "column", gap: "18px" }}>
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
<svg width="28" height="28" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#5B2EFF"></rect><path d="M16 50L32 14L48 50M22 38h20" fill="none" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "17px" }}>Admin dashboard</span>
</div>
<span style={{ padding: "5px 12px", borderRadius: "999px", background: "#FFFFFF", color: "#3A1FB8", fontSize: "13px", fontWeight: "700" }}>Site type: {sel.label}</span>
</div>
<p style={{ margin: "0", fontSize: "16px", color: "#4F4D72" }}>{sel.desc}</p>
<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
{sel.tiles.map((tile) => (
<Fragment key={tile.name}>
<div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "16px", borderRadius: "16px", background: "#FFFFFF", border: "1px solid #E2E7EF" }}>
<span style={{ flex: "0 0 auto", width: "34px", height: "34px", borderRadius: "10px", background: tile.tint, boxShadow: `0 0 14px ${tile.glow}` }}></span>
<span style={{ fontWeight: "700", fontSize: "16px" }}>{tile.name}</span>
</div>
</Fragment>
))}
</div>
<p style={{ margin: "auto 0 0", fontSize: "14px", color: "#5A5878" }}>A platform admin can see every tenant.</p>
</div>

{/* public site preview */}
<div style={{ background: "#FFD9EE", border: "1.5px solid #15132E", borderRadius: "24px", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "7px 7px 0 #FF8AD0" }}>
<div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: "1px solid #E2E7EF", background: "#FBFAFE" }}>
<span style={{ display: "flex", gap: "6px" }} aria-hidden="true"><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FF8AD0" }}></span><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#9D8CFF" }}></span><span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#19E6FF" }}></span></span>
<span style={{ flex: "1 1 auto", minWidth: "0", padding: "6px 14px", borderRadius: "999px", background: "#EDF1F6", fontSize: "13px", fontWeight: "600", color: "#3B3960", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sel.domain}</span>
</div>
<div role="img" aria-label="Illustration of the generated public website for this site type" style={{ position: "relative", minHeight: "300px", background: "#F8FAFC", padding: "18px 20px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "16px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
<span style={{ width: "22px", height: "22px", borderRadius: "7px", background: "#5B2EFF" }}></span>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "13px" }}>{sel.pub}</span>
<span style={{ marginLeft: "auto", width: "34px", height: "6px", borderRadius: "3px", background: "#CBD3E0" }}></span>
<span style={{ width: "34px", height: "6px", borderRadius: "3px", background: "#CBD3E0" }}></span>
<span style={{ width: "34px", height: "6px", borderRadius: "3px", background: "#CBD3E0" }}></span>
<span style={{ width: "58px", height: "22px", borderRadius: "999px", background: "#15132E" }}></span>
</div>
<div style={{ display: "flex", alignItems: "center", gap: "18px", padding: "18px", borderRadius: "16px", background: sel.soft }}>
<div style={{ flex: "1 1 auto", minWidth: "0", display: "flex", flexDirection: "column", gap: "9px" }}>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "22px", lineHeight: "1.1", letterSpacing: "-0.02em" }}>{sel.label}</span>
<span style={{ width: "88%", height: "7px", borderRadius: "4px", background: "rgba(21,19,46,0.22)" }}></span>
<span style={{ width: "62%", height: "7px", borderRadius: "4px", background: "rgba(21,19,46,0.22)" }}></span>
<span style={{ marginTop: "4px", width: "92px", height: "28px", borderRadius: "9px", background: "#5B2EFF", boxShadow: "3px 3px 0 #15132E" }}></span>
</div>
<div style={{ position: "relative", flex: "0 0 120px", height: "104px" }}>
<span style={{ position: "absolute", left: "8px", top: "10px", width: "84px", height: "84px", borderRadius: "50%", background: "#FFFFFF", border: "1.5px solid #15132E" }}></span>
<span style={{ position: "absolute", left: "44px", top: "0", width: "70px", height: "54px", borderRadius: "14px", background: sel.neon, border: "1.5px solid #15132E", boxShadow: `0 0 22px ${sel.neon}` }}></span>
<span style={{ position: "absolute", left: "0", top: "60px", width: "62px", height: "40px", borderRadius: "12px", background: "#5B2EFF", border: "1.5px solid #15132E" }}></span>
<svg style={{ position: "absolute", left: "64px", top: "12px" }} width="30" height="30" viewBox="0 0 24 24" fill="#15132E" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"></path></svg>
</div>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: "10px" }}>
{sel.tiles.map((tile) => (
<Fragment key={tile.name}>
<div style={{ background: "#FFFFFF", border: "1px solid #E2E7EF", borderRadius: "12px", padding: "10px", display: "flex", flexDirection: "column", gap: "7px" }}>
<span style={{ height: "34px", borderRadius: "8px", background: tile.tint }}></span>
<span style={{ fontSize: "12px", fontWeight: "700" }}>{tile.name}</span>
<span style={{ width: "70%", height: "5px", borderRadius: "3px", background: "#DDE3EC" }}></span>
</div>
</Fragment>
))}
</div>
<div style={{ position: "absolute", right: "14px", top: "52px", display: "flex", alignItems: "center", gap: "7px", padding: "7px 12px", borderRadius: "999px", background: "#15132E", color: "#FFFFFF", fontSize: "12px", fontWeight: "700", boxShadow: "0 0 0 2px #19E6FF, 0 0 18px rgba(25,230,255,0.8)" }}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="#19E6FF" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"></path></svg>
Preset applied
</div>
</div>
<div style={{ padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: "6px" }}>
<span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A5878" }}>Public site</span>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "20px" }}>{sel.pub}</span>
</div>
</div>
</div>
</div>
</section>
    </>
  );
}
