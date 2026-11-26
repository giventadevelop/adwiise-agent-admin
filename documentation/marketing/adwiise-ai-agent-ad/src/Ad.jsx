import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadGrotesk } from '@remotion/google-fonts/SpaceGrotesk';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { END, FPS, VO, scene } from './timeline.js';

const { fontFamily: GROTESK } = loadGrotesk('normal', { weights: ['500', '700'], subsets: ['latin'] });
const { fontFamily: INTER } = loadInter('normal', { weights: ['400', '500', '600'], subsets: ['latin'] });

// Brand tokens, taken from the sales deck.
const C = {
  ink: '#041126',
  navy: '#061A38',
  blue: '#0A3A6E',
  teal: '#0B6F7A',
  steel: '#2E7490',
  lime: '#B6F03C',
  white: '#F2F8FA',
  mist: '#DCEBF0',
  dim: 'rgba(220,235,240,0.62)',
  line: 'rgba(220,235,240,0.18)',
  card: 'rgba(6,26,56,0.62)',
};

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
const ease = Easing.bezier(0, 0, 0.2, 1);
const useT = () => useCurrentFrame() / FPS;
const useLayout = () => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return { width, height, vertical, pad: vertical ? 72 : 120 };
};

const prog = (t, at, dur = 0.7) => interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: ease });

const Appear = ({ at, dur = 0.7, y = 28, style, children }) => {
  const p = prog(useT(), at, dur);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * y}px)`, ...style }}>{children}</div>;
};

const SceneFill = ({ id, first, last, style, children }) => {
  const t = useT();
  const { start, end } = scene(id);
  if (t < start - 0.3 || t > end + 0.3) return null;
  const fadeIn = first ? 1 : interpolate(t, [start - 0.22, start + 0.22], [0, 1], clamp);
  const fadeOut = last ? 1 : interpolate(t, [end - 0.22, end + 0.22], [1, 0], clamp);
  const drift = interpolate(t, [start, end], [1, 1.025], clamp);
  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut), transform: `scale(${drift})`, ...style }}>
      {children}
    </AbsoluteFill>
  );
};

const Kicker = ({ children, color = C.lime }) => (
  <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 26, letterSpacing: 6, textTransform: 'uppercase', color }}>
    {children}
  </div>
);

const Headline = ({ size, children, style }) => (
  <div style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: size, lineHeight: 1.06, letterSpacing: -2, color: C.white, ...style }}>
    {children}
  </div>
);

const Lime = ({ children }) => <span style={{ color: C.lime }}>{children}</span>;

/* ---------- Background ---------- */

const Background = () => {
  const t = useT();
  const mood = interpolate(t, [15.0, 16.2], [0, 1], clamp); // 0 = old way, 1 = brand
  const drift = interpolate(t, [0, END], [0, -60]);
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <AbsoluteFill style={{ background: `linear-gradient(135deg, ${C.ink} 0%, #08213F 60%, #0B2B45 100%)` }} />
      <AbsoluteFill style={{ opacity: mood, background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 52%, ${C.teal} 100%)` }} />
      <AbsoluteFill style={{ opacity: 0.1 + mood * 0.28, mixBlendMode: 'screen', filter: 'invert(1) hue-rotate(180deg)' }}>
        <Img src={staticFile('brand/circuit.png')} style={{ width: '112%', height: '112%', objectFit: 'cover', transform: `translate(${drift}px, ${drift * 0.4}px)` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center, rgba(4,17,38,0) 45%, rgba(4,17,38,0.55) 100%)' }} />
    </AbsoluteFill>
  );
};

/* ---------- Persistent brand lockup ---------- */

const BrandBug = () => {
  const t = useT();
  const { pad, vertical } = useLayout();
  const a = interpolate(t, [0.3, 1.0, 14.9, 15.3], [0, 1, 1, 0], clamp);
  const b = interpolate(t, [19.7, 20.3, 51.7, 52.1], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: 'absolute', top: vertical ? 84 : 64, left: pad, display: 'flex', alignItems: 'center', gap: 18, opacity: Math.max(a, b) }}>
      <Img src={staticFile('brand/giventa-g.png')} style={{ width: 56, height: 56 }} />
      <div>
        <div style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: 28, color: C.white, letterSpacing: -0.3 }}>Adwiise AI Agent</div>
        <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 19, color: C.dim, marginTop: 2 }}>by Giventa Inc</div>
      </div>
    </div>
  );
};

/* ---------- 1. Hook ---------- */

const Hook = () => {
  const { vertical, pad } = useLayout();
  return (
    <SceneFill id="hook" first style={{ justifyContent: 'center', padding: pad }}>
      <Appear at={0.35}><Kicker color="#8FB6C8">The old way</Kicker></Appear>
      <Appear at={0.6} dur={0.9} style={{ marginTop: 30 }}>
        <Headline size={vertical ? 104 : 132}>
          A new website used to{vertical ? ' ' : <br />}take <span style={{ color: '#9CC7D8', whiteSpace: 'nowrap' }}>a season.</span>
        </Headline>
      </Appear>
    </SceneFill>
  );
};

/* ---------- 2. Pain ---------- */

const OWN = [
  { word: 'design', at: 4.0 },
  { word: 'hosting', at: 5.32 },
  { word: 'payments', at: 6.24 },
  { word: 'maintenance', at: 7.01 },
];

const WeekBar = ({ cell, gap }) => {
  const t = useT();
  const first = interpolate(t, [8.55, 11.0], [0, 20], clamp);
  const wipe = interpolate(t, [11.45, 11.9], [1, 0], clamp);
  const second = interpolate(t, [12.1, 15.2], [0, 6], clamp);
  return (
    <div style={{ display: 'flex', gap }}>
      {Array.from({ length: 20 }, (_, i) => {
        const a = Math.min(1, Math.max(0, first - i)) * wipe;
        const b = Math.min(1, Math.max(0, second - i));
        const on = Math.max(a, b);
        return (
          <div key={i} style={{ width: cell, height: cell * 1.5, borderRadius: 6, border: `2px solid ${C.line}`, backgroundColor: `rgba(156,199,216,${on * (i >= 16 ? 0.5 : 0.92)})` }} />
        );
      })}
    </div>
  );
};

const Pain = () => {
  const t = useT();
  const { vertical, pad, width } = useLayout();
  const listDim = interpolate(t, [8.3, 8.9], [1, 0.4], clamp);
  const colW = vertical ? width - pad * 2 : 780;
  const cell = vertical ? 34 : 30;
  return (
    <SceneFill id="pain" style={{ padding: pad, flexDirection: vertical ? 'column' : 'row', alignItems: 'center', justifyContent: vertical ? 'center' : 'space-between', gap: vertical ? 110 : 80 }}>
      <div style={{ width: vertical ? colW : undefined, flexShrink: 0, opacity: listDim }}>
        {OWN.map((o) => (
          <Appear key={o.word} at={o.at} dur={0.5} y={20} style={{ marginBottom: 14 }}>
            <Headline size={vertical ? 86 : 88} style={{ whiteSpace: 'nowrap' }}>
              <span style={{ color: 'rgba(220,235,240,0.42)', fontWeight: 500 }}>Its own </span>{o.word}
            </Headline>
          </Appear>
        ))}
      </div>
      <div style={{ width: colW }}>
        <Appear at={8.55} dur={0.8}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, whiteSpace: 'nowrap' }}>
            <div style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: vertical ? 200 : 184, lineHeight: 0.95, letterSpacing: -6, color: C.white }}>16–20</div>
            <div style={{ fontFamily: GROTESK, fontWeight: 500, fontSize: vertical ? 72 : 60, color: '#9CC7D8' }}>weeks</div>
          </div>
        </Appear>
        <Appear at={8.8} dur={0.6} style={{ marginTop: 34 }}>
          <WeekBar cell={cell} gap={vertical ? 10 : 9} />
        </Appear>
        <Appear at={11.45} dur={0.8} style={{ marginTop: 52 }}>
          <div style={{ fontFamily: GROTESK, fontWeight: 500, fontSize: vertical ? 56 : 52, lineHeight: 1.15, color: C.white }}>
            Then the next organization<br />starts all over again.
          </div>
        </Appear>
      </div>
    </SceneFill>
  );
};

/* ---------- 3. Brand reveal ---------- */

const Lockup = ({ at, size, sub }) => {
  const t = useT();
  const p = prog(t, at, 0.9);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Img src={staticFile('brand/giventa-g.png')} style={{ width: size * 1.5, height: size * 1.5, opacity: p, transform: `scale(${0.86 + p * 0.14})` }} />
      <Appear at={at + 0.25} dur={0.8} style={{ marginTop: 34 }}>
        <Headline size={size} style={{ textAlign: 'center' }}>Adwiise AI Agent</Headline>
      </Appear>
      <Appear at={at + 0.55} dur={0.7} style={{ marginTop: 14 }}>
        <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: size * 0.34, color: C.mist }}>{sub}</div>
      </Appear>
    </div>
  );
};

const Brand = () => {
  const { vertical } = useLayout();
  return (
    <SceneFill id="brand" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Lockup at={15.55} size={vertical ? 96 : 128} sub="by Giventa Inc" />
      <Appear at={17.75} dur={0.7} style={{ marginTop: 46 }}>
        <div style={{ fontFamily: GROTESK, fontWeight: 500, fontSize: 54, color: C.lime }}>changes that.</div>
      </Appear>
    </SceneFill>
  );
};

/* ---------- 4. Solution ---------- */

const STEPS = [
  { label: 'Onboard', at: 23.4 },
  { label: 'Approve', at: 24.0 },
  { label: 'Site type + domain', at: 24.45 },
  { label: 'Brand', at: 24.93 },
  { label: 'Publish', at: 26.03 },
];

const Step = ({ n, label, at, vertical }) => {
  const t = useT();
  const lit = prog(t, at, 0.35);
  return (
    <div style={{ display: 'flex', flexDirection: vertical ? 'row' : 'column', alignItems: 'center', gap: vertical ? 28 : 20, flex: vertical ? undefined : 1, opacity: 0.4 + lit * 0.6 }}>
      <div style={{ width: 76, height: 76, borderRadius: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: GROTESK, fontWeight: 700, fontSize: 34, border: `3px solid ${lit > 0.5 ? C.lime : C.line}`, backgroundColor: `rgba(182,240,60,${lit})`, color: lit > 0.5 ? C.navy : C.mist, transform: `scale(${1 + Math.sin(lit * Math.PI) * 0.1})` }}>
        {n}
      </div>
      <div style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: vertical ? 46 : 36, color: C.white, textAlign: 'center', whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  );
};

const Solution = () => {
  const t = useT();
  const { vertical, pad, width } = useLayout();
  const lift = interpolate(t, [22.75, 23.5], [vertical ? 420 : 270, 0], { ...clamp, easing: Easing.bezier(0.4, 0, 0.2, 1) });
  const trackW = width - pad * 2;
  const fill = interpolate(t, [23.4, 24.0, 24.45, 24.93, 26.03], [0, 0.25, 0.5, 0.75, 1], { ...clamp, easing: Easing.linear });
  return (
    <SceneFill id="solution" style={{ alignItems: 'center', justifyContent: 'center', padding: pad }}>
      <div style={{ transform: `translateY(${lift}px)`, textAlign: 'center' }}>
        <Headline size={vertical ? 112 : 132}>
          <Appear at={20.1} style={{ display: vertical ? 'block' : 'inline-block' }}>Many sites.</Appear>
          {vertical ? null : ' '}
          <Appear at={21.42} style={{ display: vertical ? 'block' : 'inline-block' }}><Lime>One platform.</Lime></Appear>
        </Headline>
      </div>
      <Appear at={22.95} dur={0.6} style={{ marginTop: vertical ? 90 : 96, width: vertical ? undefined : trackW, position: 'relative' }}>
        {vertical ? null : (
          <div style={{ position: 'absolute', top: 37, left: trackW * 0.1, width: trackW * 0.8, height: 3, backgroundColor: C.line }}>
            <div style={{ width: `${fill * 100}%`, height: 3, backgroundColor: C.lime }} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: vertical ? 34 : 0, position: 'relative', alignItems: vertical ? 'flex-start' : 'flex-start' }}>
          {STEPS.map((s, i) => <Step key={s.label} n={i + 1} label={s.label} at={s.at} vertical={vertical} />)}
        </div>
      </Appear>
      <Appear at={26.3} dur={0.7} style={{ marginTop: vertical ? 96 : 92, textAlign: 'center' }}>
        <div style={{ fontFamily: GROTESK, fontWeight: 500, fontSize: vertical ? 58 : 60, lineHeight: 1.25, color: C.white }}>
          On their own domain.<br />
          <span style={{ opacity: prog(t, 27.92, 0.6) }}><Lime>In days, not months.</Lime></span>
        </div>
      </Appear>
    </SceneFill>
  );
};

/* ---------- 5. Proof ---------- */

const SITES = [
  { shot: 'kerala.png', name: 'Kerala Center', url: 'www.keralacenter.org', tag: 'Community', at: 32.46 },
  { shot: 'strikers.png', name: 'MD Strikers', url: 'www.md-strikers.com', tag: 'Sports', at: 33.77 },
  { shot: 'mcefee.png', name: 'MCEFEE', url: 'www.mcefee-temp.com', tag: 'Events & ticketing', at: 35.13 },
  { shot: 'school.png', name: 'School template', url: 'www.bst-school-demo.com', tag: 'School', at: 36.05 },
];
const TYPES = ['Community', 'Sports', 'Church', 'School', 'Events', 'Retail'];

const SiteCard = ({ site, w }) => {
  const t = useT();
  const p = prog(t, site.at, 0.7);
  const zoom = interpolate(t, [site.at, 39.5], [1.0, 1.06], clamp);
  return (
    <div style={{ width: w, opacity: p, transform: `translateY(${(1 - p) * 36}px)`, borderRadius: 20, overflow: 'hidden', backgroundColor: C.card, border: `1.5px solid ${C.line}`, boxShadow: '0 24px 60px rgba(2,10,24,0.45)' }}>
      <div style={{ width: w, height: w / 1.85, overflow: 'hidden' }}>
        <Img src={staticFile(`shots/${site.shot}`)} style={{ width: w, height: w / 1.6, objectFit: 'cover', objectPosition: 'top', transform: `scale(${zoom})`, transformOrigin: 'top center' }} />
      </div>
      <div style={{ padding: '22px 26px 26px' }}>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 19, letterSpacing: 2.5, textTransform: 'uppercase', color: C.lime }}>{site.tag}</div>
        <div style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: 40, color: C.white, marginTop: 8, whiteSpace: 'nowrap' }}>{site.name}</div>
        <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 25, color: C.mist, marginTop: 6, whiteSpace: 'nowrap' }}>{site.url}</div>
      </div>
    </div>
  );
};

const Proof = () => {
  const { vertical, pad, width } = useLayout();
  const gap = 28;
  const cols = vertical ? 2 : 4;
  const w = (width - pad * 2 - gap * (cols - 1)) / cols;
  return (
    <SceneFill id="proof" style={{ padding: pad, justifyContent: 'center' }}>
      <Appear at={30.85}><Kicker>Already live</Kicker></Appear>
      <Appear at={31.0} dur={0.8} style={{ marginTop: 18 }}>
        <Headline size={vertical ? 84 : 96}>Four sites. One platform.</Headline>
      </Appear>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap, marginTop: 48 }}>
        {SITES.map((s) => <SiteCard key={s.name} site={s} w={w} />)}
      </div>
      <Appear at={36.75} dur={0.7} style={{ marginTop: 44, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 22, letterSpacing: 3, textTransform: 'uppercase', color: C.dim, marginRight: 10, width: vertical ? '100%' : undefined }}>Site types</div>
        {TYPES.map((x) => (
          <div key={x} style={{ fontFamily: GROTESK, fontWeight: 500, fontSize: 34, color: C.white, padding: '12px 28px', borderRadius: 40, border: `1.5px solid ${C.line}`, backgroundColor: 'rgba(6,26,56,0.5)' }}>{x}</div>
        ))}
      </Appear>
    </SceneFill>
  );
};

/* ---------- 6. Benefits ---------- */

const ICONS = {
  ticket: <path d="M4 9a2 2 0 0 0 0 6v3h16v-3a2 2 0 0 1 0-6V6H4v3zM14 6v12" />,
  fees: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" />,
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.600-7 10-7 10z" />,
  media: <path d="M4 5h16v14H4V5zM4 16l5-5 4 4 3-3 4 4M15.500 9.500h.01" />,
};
const BENEFITS = [
  { icon: 'ticket', title: 'Sell tickets', sub: 'Events & ticketing', at: 39.91 },
  { icon: 'fees', title: 'Collect fees', sub: 'School fee invoices', at: 41.08 },
  { icon: 'heart', title: 'Take donations', sub: 'Online donations', at: 42.4 },
  { icon: 'media', title: 'Manage media', sub: 'Galleries & banners', at: 43.91 },
];

const Benefits = () => {
  const { vertical, pad, width } = useLayout();
  const gap = 28;
  const cols = vertical ? 2 : 4;
  const w = (width - pad * 2 - gap * (cols - 1)) / cols;
  return (
    <SceneFill id="benefits" style={{ padding: pad, justifyContent: 'center' }}>
      <Appear at={39.7}><Kicker>Built in</Kicker></Appear>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap, marginTop: 40 }}>
        {BENEFITS.map((b) => (
          <Appear key={b.title} at={b.at} dur={0.6} style={{ width: w, boxSizing: 'border-box', padding: '48px 36px', borderRadius: 22, backgroundColor: C.card, border: `1.5px solid ${C.line}` }}>
            <svg width="88" height="88" viewBox="0 0 24 24" fill="none" stroke={C.lime} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICONS[b.icon]}</svg>
            <div style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: vertical ? 46 : 44, color: C.white, marginTop: 30, whiteSpace: 'nowrap' }}>{b.title}</div>
            <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 27, color: C.dim, marginTop: 10 }}>{b.sub}</div>
          </Appear>
        ))}
      </div>
      <Appear at={44.3} dur={0.7} style={{ marginTop: 40 }}>
        <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 32, color: C.mist }}>
          Payments with <b style={{ color: C.white }}>Stripe</b> · <b style={{ color: C.white }}>Givebutter</b> · <b style={{ color: C.white }}>Razorpay</b>
        </div>
      </Appear>
      <Appear at={45.5} dur={0.8} style={{ marginTop: 44 }}>
        <Headline size={vertical ? 86 : 112}>All from <Lime>one dashboard.</Lime></Headline>
      </Appear>
    </SceneFill>
  );
};

/* ---------- 7. Closing line ---------- */

const Close = () => {
  const { vertical, pad } = useLayout();
  return (
    <SceneFill id="close" style={{ padding: pad, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Appear at={48.82} dur={0.9}>
        <Headline size={vertical ? 92 : 136}>
          Your next site is<br /><Lime>a configuration.</Lime>
        </Headline>
      </Appear>
    </SceneFill>
  );
};

/* ---------- 8. End card ---------- */

const EndCard = () => {
  const { vertical } = useLayout();
  return (
    <SceneFill id="end" last style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <Lockup at={52.15} size={vertical ? 96 : 104} sub="by Giventa Inc" />
      <Appear at={52.9} dur={0.7} style={{ marginTop: 34 }}>
        <div style={{ fontFamily: GROTESK, fontWeight: 500, fontSize: vertical ? 40 : 40, color: C.mist }}>
          Many sites. One platform.{vertical ? <br /> : ' '}Days, not a new build.
        </div>
      </Appear>
      <Appear at={53.3} dur={0.8} style={{ marginTop: 46 }}>
        <div style={{ fontFamily: GROTESK, fontWeight: 700, fontSize: vertical ? 76 : 84, color: C.navy, backgroundColor: C.lime, padding: '18px 58px', borderRadius: 80, letterSpacing: -1 }}>adwiiseagent.ai</div>
      </Appear>
      <Appear at={53.8} dur={0.7} style={{ marginTop: 40 }}>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 38, color: C.white }}>
          sales@giventa.com{vertical ? <br /> : '  ·  '}+1 (312) 343-0073
        </div>
        <div style={{ fontFamily: INTER, fontWeight: 500, fontSize: 30, color: C.mist, marginTop: 16 }}>
          www.giventa.com  ·  New Jersey, USA
        </div>
      </Appear>
    </SceneFill>
  );
};

/* ---------- Composition ---------- */

const musicVolume = (f) => {
  const t = f / FPS;
  const bed = interpolate(t, [0, 1.2, 56.1, 57.0], [0, 0.2, 0.2, 0.34], clamp);
  const out = interpolate(t, [END - 1.4, END - 0.05], [1, 0], clamp);
  return bed * out;
};

export const Ad = ({ bgm = true }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 12], [0, 1], clamp);
  const fadeOut = interpolate(frame / FPS, [END - 0.5, END], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ backgroundColor: C.ink }}>
      <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
        <Background />
        <Hook />
        <Pain />
        <Brand />
        <Solution />
        <Proof />
        <Benefits />
        <Close />
        <EndCard />
        <BrandBug />
      </AbsoluteFill>
      {bgm ? <Audio src={staticFile('audio/music.mp3')} volume={musicVolume} /> : null}
      {VO.map((v) => (
        <Sequence key={v.file} from={Math.round(v.start * FPS)} layout="none">
          <Audio src={staticFile(`audio/${v.file}`)} volume={1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
