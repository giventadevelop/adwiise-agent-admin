import { Fragment } from 'react';
import type { CSSProperties } from 'react';

const OUTER_RADIUS = 245;
const INNER_RADIUS = 150;

const sites = [
  { kind: 'Community', name: 'keralacenter.org', tint: '#19E6FF' },
  { kind: 'Sports team', name: 'md-strikers.com', tint: '#FF3DA6' },
  { kind: 'Events', name: 'mcefee-temp.com', tint: '#9D8CFF' },
  { kind: 'School', name: 'bst-school-demo.com', tint: '#19E6FF' },
  { kind: 'Site type', name: 'Church', tint: '#FF3DA6' },
  { kind: 'Site type', name: 'Retail and shop', tint: '#9D8CFF' },
].map((site, i) => {
  const angle = 30 + i * 60;
  return {
    ...site,
    a: `${angle}deg`,
    beam: `rotateZ(${angle}deg)`,
    slot: `rotateZ(${angle}deg) translateX(${OUTER_RADIUS}px)`,
    un: `rotateZ(${-angle}deg)`,
    delay: `${-i * 0.55}s`,
  };
});

const caps = [
  { label: 'Events', tint: '#19E6FF' },
  { label: 'Payments', tint: '#FF3DA6' },
  { label: 'Media', tint: '#9D8CFF' },
  { label: 'AI search', tint: '#19E6FF' },
].map((cap, i) => {
  const angle = i * 90;
  return {
    ...cap,
    a: `${angle}deg`,
    slot: `rotateZ(${angle}deg) translateX(${INNER_RADIUS}px)`,
    un: `rotateZ(${-angle}deg)`,
  };
});

/** CSS-only 3D hero: the admin hub with tenant sites orbiting it. Animations live in hubLanding.css. */
export default function HeroScene() {
  return (
    <>
{/* 3D scene */}
<div className="aa-stage" role="img" aria-label="Animated 3D view of the Adwiise Agent admin hub with tenant sites orbiting around it" style={{ "--dur": "44s", position: "relative", flex: "0 0 auto", width: "660px", height: "570px" } as CSSProperties}>
<div className="aa-halo" style={{ position: "absolute", left: "110px", top: "150px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(25,230,255,0.38), rgba(25,230,255,0) 68%)" }}></div>
<div className="aa-halo" style={{ position: "absolute", left: "290px", top: "190px", width: "300px", height: "300px", borderRadius: "50%", background: "radial-gradient(circle, rgba(255,61,166,0.26), rgba(255,61,166,0) 68%)", animationDelay: "-2s" }}></div>
<svg className="aa-twinkle" style={{ position: "absolute", left: "70px", top: "70px" }} width="34" height="34" viewBox="0 0 24 24" fill="#19E6FF" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"></path></svg>
<svg className="aa-twinkle" style={{ position: "absolute", left: "560px", top: "120px", animationDelay: "-1s" }} width="24" height="24" viewBox="0 0 24 24" fill="#FFE14D" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"></path></svg>
<svg className="aa-twinkle" style={{ position: "absolute", left: "40px", top: "470px", animationDelay: "-1.8s" }} width="22" height="22" viewBox="0 0 24 24" fill="#FFE14D" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"></path></svg>
<svg className="aa-twinkle" style={{ position: "absolute", left: "600px", top: "480px", animationDelay: "-0.5s" }} width="30" height="30" viewBox="0 0 24 24" fill="#19E6FF" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"></path></svg>
<div style={{ position: "absolute", right: "8px", top: "8px", display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "999px", background: "#15132E", color: "#FFFFFF", fontSize: "13px", fontWeight: "700", boxShadow: "0 0 0 2px #19E6FF, 0 0 20px rgba(25,230,255,0.8)" }}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#19E6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="5" cy="12" r="2.2"></circle><circle cx="18" cy="5" r="2.2"></circle><circle cx="18" cy="19" r="2.2"></circle><path d="M7 11l9-5M7 13l9 5"></path></svg>AI agents at work</div>
<div style={{ position: "absolute", inset: "0", perspective: "1500px", perspectiveOrigin: "50% 25%" }}>
<div style={{ position: "absolute", left: "50%", top: "340px", width: "0", height: "0", transformStyle: "preserve-3d", transform: "rotateX(62deg)" }}>

{/* platform discs */}
<div style={{ position: "absolute", left: "-290px", top: "-290px", width: "580px", height: "580px", borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1.5px solid #B9A8FF", boxShadow: "0 0 46px rgba(157,140,255,0.45), inset 0 0 70px rgba(25,230,255,0.22)" }}></div>
<div style={{ position: "absolute", left: "-245px", top: "-245px", width: "490px", height: "490px", borderRadius: "50%", border: "1.5px dashed #9D8CFF" }}></div>
<div style={{ position: "absolute", left: "-150px", top: "-150px", width: "300px", height: "300px", borderRadius: "50%", border: "1.5px solid #19E6FF", boxShadow: "0 0 18px rgba(25,230,255,0.6)" }}></div>
<div style={{ position: "absolute", left: "-84px", top: "-84px", width: "168px", height: "168px", borderRadius: "50%", background: "#FFFFFF", border: "1.5px solid #CFC6FF", transform: "translateZ(12px)" }}></div>
<div style={{ position: "absolute", left: "-66px", top: "-66px", width: "132px", height: "132px", borderRadius: "50%", background: "#EFEAFF", border: "1.5px solid #9D8CFF", transform: "translateZ(26px)" }}></div>
<div style={{ position: "absolute", left: "-48px", top: "-48px", width: "96px", height: "96px", borderRadius: "50%", background: "#5B2EFF", boxShadow: "0 0 30px rgba(91,46,255,0.7)", transform: "translateZ(40px)" }}></div>

{/* central hub */}
<div className="aa-bob" style={{ position: "absolute", left: "0", top: "0", width: "0", height: "0", transformStyle: "preserve-3d", transform: "translateZ(44px)" }}>
<div style={{ position: "absolute", left: "-92px", bottom: "0", width: "184px", transformOrigin: "50% 100%", transform: "rotateX(-62deg)", background: "#FFFFFF", border: "1.5px solid #15132E", borderRadius: "18px", padding: "14px 16px 16px", boxSizing: "border-box", boxShadow: "0 18px 44px rgba(91,46,255,0.35), 0 0 0 5px rgba(25,230,255,0.35)", display: "flex", flexDirection: "column", gap: "10px" }}>
<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
<svg width="26" height="26" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="14" fill="#5B2EFF"></rect><path d="M16 50L32 14L48 50M22 38h20" fill="none" stroke="#FFFFFF" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"></path></svg>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "15px", whiteSpace: "nowrap" }}>Admin hub</span>
<span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "999px", background: "#15132E", color: "#19E6FF", fontSize: "11px", fontWeight: "700", boxShadow: "0 0 10px rgba(25,230,255,0.9)" }}><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"></path></svg>AI</span>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px" }}>
<span style={{ height: "26px", borderRadius: "7px", background: "#EFEAFF" }}></span>
<span style={{ height: "26px", borderRadius: "7px", background: "#D6FBFF" }}></span>
<span style={{ height: "26px", borderRadius: "7px", background: "#FFE3F3" }}></span>
<span style={{ height: "26px", borderRadius: "7px", background: "#D6FBFF" }}></span>
<span style={{ height: "26px", borderRadius: "7px", background: "#FFE3F3" }}></span>
<span style={{ height: "26px", borderRadius: "7px", background: "#EFEAFF" }}></span>
</div>
<span style={{ fontSize: "11px", fontWeight: "700", color: "#4F4D72" }}>One dashboard · every tenant</span>
</div>
</div>

{/* outer ring: tenant sites */}
<div className="aa-spin" style={{ position: "absolute", left: "0", top: "0", width: "0", height: "0", transformStyle: "preserve-3d" }}>
{sites.map((s) => (
<Fragment key={s.name}>
<div style={{ position: "absolute", left: "0", top: "-1px", width: "245px", height: "2px", transformOrigin: "0 50%", transform: s.beam, background: "linear-gradient(90deg, rgba(91,46,255,0.5), rgba(25,230,255,0.12))" }}>
<span className="aa-pulse" style={{ position: "absolute", left: "0", top: "-4px", width: "10px", height: "10px", borderRadius: "50%", background: "#19E6FF", boxShadow: "0 0 12px 3px rgba(25,230,255,0.85)", animationDelay: s.delay }}></span>
</div>
<div style={{ position: "absolute", left: "0", top: "0", width: "0", height: "0", transformStyle: "preserve-3d", transform: s.slot }}>
<div className="aa-unspin" style={{ "--a": s.a, position: "absolute", left: "0", top: "0", width: "0", height: "0", transformStyle: "preserve-3d", transform: s.un } as CSSProperties}>
<div style={{ position: "absolute", left: "-72px", bottom: "0", width: "144px", transformOrigin: "50% 100%", transform: "rotateX(-62deg)", background: "#FFFFFF", border: "1px solid #D9D4F0", borderRadius: "14px", boxSizing: "border-box", padding: "0 0 12px", boxShadow: "0 14px 30px rgba(91,46,255,0.2)", display: "flex", flexDirection: "column", gap: "6px" }}>
<span style={{ height: "5px", borderRadius: "14px 14px 0 0", background: s.tint }}></span>
<span style={{ padding: "4px 12px 0", fontSize: "10px", fontWeight: "700", letterSpacing: "0.06em", textTransform: "uppercase", color: "#5A5878" }}>{s.kind}</span>
<span style={{ padding: "0 12px", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "13px", color: "#15132E" }}>{s.name}</span>
<span style={{ margin: "2px 12px 0", height: "6px", borderRadius: "3px", background: "#E8ECF2" }}></span>
<span style={{ margin: "0 12px", height: "6px", width: "60%", borderRadius: "3px", background: "#E8ECF2" }}></span>
</div>
</div>
</div>
</Fragment>
))}
</div>

{/* inner ring: capabilities */}
<div className="aa-spin-rev" style={{ position: "absolute", left: "0", top: "0", width: "0", height: "0", transformStyle: "preserve-3d" }}>
{caps.map((c) => (
<Fragment key={c.label}>
<div style={{ position: "absolute", left: "0", top: "0", width: "0", height: "0", transformStyle: "preserve-3d", transform: c.slot }}>
<div className="aa-unspin-rev" style={{ "--a": c.a, position: "absolute", left: "0", top: "0", width: "0", height: "0", transformStyle: "preserve-3d", transform: c.un } as CSSProperties}>
<div style={{ position: "absolute", left: "-46px", bottom: "0", width: "92px", height: "30px", transformOrigin: "50% 100%", transform: "rotateX(-62deg)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "999px", background: "#15132E", color: "#FFFFFF", fontSize: "11.5px", fontWeight: "700", boxShadow: `0 0 0 2px ${c.tint}, 0 0 16px ${c.tint}` }}>{c.label}</div>
</div>
</div>
</Fragment>
))}
</div>

</div>
</div>
</div>
    </>
  );
}
