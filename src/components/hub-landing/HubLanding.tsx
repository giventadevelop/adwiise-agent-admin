import './hubLanding.css';
import HubEntryButton from '@/app/HubEntryButton';
import HeroScene from './HeroScene';
import SiteTypeSwitch from './SiteTypeSwitch';

/**
 * Public landing page for the admin hub root.
 * Static marketing content only: no tenant-scoped data is loaded here.
 * The negative bottom margin covers the shared footer's top margin so the
 * page background runs straight into the footer.
 */
export default function HubLanding() {
  return (
    <div
      className="aa-landing"
      style={{
        backgroundColor: '#A3124F',
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        color: '#15132E',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: '16px',
        lineHeight: 1.55,
        overflowX: 'hidden',
        marginBottom: '-5rem',
        paddingBottom: '5rem',
      }}
    >
{/* HERO */}
<section id="top" style={{ position: "relative" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", padding: "56px 24px 40px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "32px" }}>
<div style={{ flex: "1 1 420px", minWidth: "0", display: "flex", flexDirection: "column", gap: "22px", alignItems: "flex-start" }}>
<div style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "7px 14px", borderRadius: "999px", background: "#FFE98A", border: "1.5px solid #15132E", boxShadow: "3px 3px 0 #19E6FF", fontSize: "13px", fontWeight: "700", letterSpacing: "0.04em", textTransform: "uppercase", color: "#3B3960" }}>
<span style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#15132E", color: "#19E6FF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(25,230,255,0.8)" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"></rect><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"></path></svg></span>
Adwiise Agent by
<img src="/images/adwiise-agent/giventa-logo.png" alt="Giventa" style={{ display: "block", height: "26px", width: "auto" }} />
</div>
<h1 style={{ margin: "0", color: "#FFFFFF", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(40px, 5.6vw, 74px)", lineHeight: "1.02", letterSpacing: "-0.035em" }}>Many sites.<br />One <span style={{ color: "#19E6FF" }}>platform.</span><svg className="aa-twinkle" style={{ marginLeft: "10px", verticalAlign: "top" }} width="0.55em" height="0.55em" viewBox="0 0 24 24" fill="#FFE14D" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"></path></svg></h1>
<p style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "600", fontSize: "clamp(20px, 2vw, 26px)", color: "#FFFFFF" }}>Days, not a new build.</p>
<p style={{ margin: "0", maxWidth: "520px", fontSize: "18px", color: "#DDD7F7" }}>One admin dashboard that onboards, brands, and runs public websites for communities, schools, sports teams, and churches. Each organization gets a site on its own domain. Staff manage it from the same hub, with AI-based tools built in.</p>
<div role="img" aria-label="Illustration of a prompt typed to the Adwiise agent" style={{ width: "100%", maxWidth: "520px", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "12px", padding: "8px 8px 8px 12px", borderRadius: "16px", background: "#FFFFFF", border: "1.5px solid #15132E", boxShadow: "0 0 0 4px rgba(25,230,255,0.35), 0 0 26px rgba(25,230,255,0.55)" }}>
<span style={{ flex: "0 0 auto", width: "34px", height: "34px", borderRadius: "10px", background: "#5B2EFF", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="5" cy="12" r="2.2"></circle><circle cx="18" cy="5" r="2.2"></circle><circle cx="18" cy="19" r="2.2"></circle><path d="M7 11l9-5M7 13l9 5"></path></svg></span>
<span style={{ flex: "1 1 auto", minWidth: "0", fontSize: "15px", fontWeight: "600", color: "#15132E" }}>Set up a school site on its own domain<span className="aa-caret" style={{ display: "inline-block", width: "2px", height: "17px", marginLeft: "3px", verticalAlign: "-3px", background: "#5B2EFF" }}></span></span>
<span style={{ flex: "0 0 auto", width: "40px", height: "40px", borderRadius: "12px", background: "#19E6FF", color: "#15132E", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"></path></svg></span>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<span style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.35)", color: "#FFFFFF", fontSize: "14px", fontWeight: "600" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#19E6FF" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>AI banner search</span>
<span style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.35)", color: "#FFFFFF", fontSize: "14px", fontWeight: "600" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="#19E6FF" aria-hidden="true"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2z"></path></svg>AI pricing</span>
<span style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", borderRadius: "999px", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.35)", color: "#FFFFFF", fontSize: "14px", fontWeight: "600" }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#19E6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"></rect><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"></path></svg>AI-based tools built in</span>
</div>
<div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginTop: "6px" }}>
<HubEntryButton variant="primary" />
<a href="#live-sites" style={{ display: "inline-flex", alignItems: "center", minHeight: "52px", padding: "0 24px", borderRadius: "14px", background: "#FFFFFF", color: "#15132E", border: "1.5px solid #15132E", fontWeight: "700", fontSize: "17px", textDecoration: "none", boxShadow: "5px 5px 0 #FF8AD0" }}>See the live sites</a>
</div>
<p style={{ margin: "6px 0 0", fontSize: "15px", color: "#DDD7F7" }}><strong style={{ color: "#FFFFFF" }}>Four sites already live</strong> on keralacenter.org, md-strikers.com, mcefee-temp.com, and the school template.</p>
</div>

<HeroScene />
</div>
</section>

{/* OLD WAY / WHAT CHANGES */}
<section id="platform" style={{ padding: "56px 0 24px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
<div style={{ background: "#FFF3B8", border: "1px solid #E2E7EF", borderRadius: "24px", padding: "32px", display: "flex", flexDirection: "column", gap: "18px" }}>
<span style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#5A5878" }}>The old way</span>
<h2 style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(26px, 2.6vw, 34px)", lineHeight: "1.12", letterSpacing: "-0.02em" }}>A new website used to take a season.</h2>
<div style={{ display: "flex", alignItems: "baseline", gap: "12px" }}>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "64px", lineHeight: "1", letterSpacing: "-0.04em", color: "#8B88A6", textDecoration: "line-through", textDecorationColor: "#FF3DA6", textDecorationThickness: "4px" }}>16–20</span>
<span style={{ fontSize: "16px", fontWeight: "600", color: "#5A5878" }}>weeks, planned</span>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
<span style={{ padding: "12px 14px", borderRadius: "12px", background: "#FFFFFF", fontSize: "15px", fontWeight: "600", color: "#4F4D72" }}>Its own design</span>
<span style={{ padding: "12px 14px", borderRadius: "12px", background: "#FFFFFF", fontSize: "15px", fontWeight: "600", color: "#4F4D72" }}>Its own hosting</span>
<span style={{ padding: "12px 14px", borderRadius: "12px", background: "#FFFFFF", fontSize: "15px", fontWeight: "600", color: "#4F4D72" }}>Its own payments</span>
<span style={{ padding: "12px 14px", borderRadius: "12px", background: "#FFFFFF", fontSize: "15px", fontWeight: "600", color: "#4F4D72" }}>Its own maintenance</span>
</div>
<p style={{ margin: "0", fontSize: "15px", color: "#5A5878" }}>Every next parish, school, or club would start that clock again.</p>
</div>

<div style={{ background: "#C9F8FF", border: "1.5px solid #15132E", borderRadius: "24px", padding: "32px", display: "flex", flexDirection: "column", gap: "18px", boxShadow: "7px 7px 0 #19E6FF" }}>
<span style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#5B2EFF" }}>What changes</span>
<h2 style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(26px, 2.6vw, 34px)", lineHeight: "1.12", letterSpacing: "-0.02em" }}>One platform. Many public sites.</h2>
<div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
<div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
<span style={{ flex: "0 0 auto", width: "40px", height: "40px", borderRadius: "12px", background: "#EFEAFF", color: "#5B2EFF", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg></span>
<div><div style={{ fontWeight: "700", fontSize: "17px" }}>Onboard a tenant</div><div style={{ fontSize: "15px", color: "#5A5878" }}>Site type, Tenant ID, branding, and its own domain.</div></div>
</div>
<div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
<span style={{ flex: "0 0 auto", width: "40px", height: "40px", borderRadius: "12px", background: "#FFFFFF", color: "#075E6B", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"></path></svg></span>
<div><div style={{ fontWeight: "700", fontSize: "17px" }}>Public site goes live</div><div style={{ fontSize: "15px", color: "#5A5878" }}>On the organization’s own domain.</div></div>
</div>
<div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
<span style={{ flex: "0 0 auto", width: "40px", height: "40px", borderRadius: "12px", background: "#FFE3F3", color: "#A3145F", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M3 10h18M9 10v10"></path></svg></span>
<div><div style={{ fontWeight: "700", fontSize: "17px" }}>Staff manage it</div><div style={{ fontSize: "15px", color: "#5A5878" }}>In the same admin dashboard.</div></div>
</div>
</div>
<div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px", paddingTop: "4px" }}>
<span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A5878", marginRight: "4px" }}>Three hostnames, one system</span>
<span style={{ padding: "6px 12px", borderRadius: "999px", background: "#15132E", color: "#FFFFFF", fontSize: "13px", fontWeight: "600" }}>keralacenter.org</span>
<span style={{ padding: "6px 12px", borderRadius: "999px", background: "#15132E", color: "#FFFFFF", fontSize: "13px", fontWeight: "600" }}>md-strikers.com</span>
<span style={{ padding: "6px 12px", borderRadius: "999px", background: "#15132E", color: "#FFFFFF", fontSize: "13px", fontWeight: "600" }}>mcefee-temp.com</span>
</div>
</div>
</div>
</section>

<SiteTypeSwitch />

{/* TURNAROUND */}
<section style={{ padding: "72px 0 24px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "760px" }}>
<span style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#19E6FF" }}>Dashboard and turnaround</span>
<h2 style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(30px, 3.6vw, 46px)", lineHeight: "1.08", letterSpacing: "-0.025em", color: "#FFFFFF" }}>The next site is a configuration, not a rebuild.</h2>
</div>
<ol style={{ listStyle: "none", margin: "0", padding: "0", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
<li style={{ background: "#E6DEFF", border: "1px solid #E2E7EF", borderRadius: "18px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}><span style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #19E6FF", boxShadow: "0 0 14px rgba(25,230,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif", fontWeight: "700" }}>1</span><span style={{ fontWeight: "700", fontSize: "17px" }}>Onboarding request</span></li>
<li style={{ background: "#E6DEFF", border: "1px solid #E2E7EF", borderRadius: "18px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}><span style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #5FD0FF", boxShadow: "0 0 14px rgba(95,208,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif", fontWeight: "700" }}>2</span><span style={{ fontWeight: "700", fontSize: "17px" }}>Approve</span></li>
<li style={{ background: "#E6DEFF", border: "1px solid #E2E7EF", borderRadius: "18px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}><span style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #9D8CFF", boxShadow: "0 0 14px rgba(157,140,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif", fontWeight: "700" }}>3</span><span style={{ fontWeight: "700", fontSize: "17px" }}>Set site type and domain</span></li>
<li style={{ background: "#E6DEFF", border: "1px solid #E2E7EF", borderRadius: "18px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}><span style={{ width: "40px", height: "40px", borderRadius: "50%", border: "2px solid #D36CFF", boxShadow: "0 0 14px rgba(211,108,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif", fontWeight: "700" }}>4</span><span style={{ fontWeight: "700", fontSize: "17px" }}>Brand it</span></li>
<li style={{ background: "#19E6FF", color: "#15132E", borderRadius: "18px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px", boxShadow: "5px 5px 0 #FFE14D" }}><span style={{ width: "40px", height: "40px", borderRadius: "50%", background: "#FFFFFF", color: "#15132E", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif", fontWeight: "700" }}>5</span><span style={{ fontWeight: "700", fontSize: "17px" }}>Publish</span></li>
</ol>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", fontSize: "16px", color: "#DDD7F7" }}>
<p style={{ margin: "0" }}>The same dashboard runs keralacenter.org, the Strikers site, and the MCEFEE site.</p>
<p style={{ margin: "0" }}>A platform admin can see every tenant.</p>
<p style={{ margin: "0" }}>Presets and shared tools make the turnaround quick.</p>
</div>
</div>
</section>

{/* PAYMENTS */}
<section id="payments" style={{ padding: "72px 0 24px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "760px" }}>
<span style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#19E6FF" }}>Ticketing, events, payments</span>
<h2 style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(30px, 3.6vw, 46px)", lineHeight: "1.08", letterSpacing: "-0.025em", color: "#FFFFFF" }}>Sell tickets. Collect fees. Take donations.</h2>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
<div style={{ background: "#FFF3B8", border: "1px solid #E2E7EF", borderRadius: "24px", padding: "28px", display: "flex", flexDirection: "column", gap: "18px" }}>
<h3 style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "22px" }}>Event management</h3>
<div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
<span style={{ padding: "10px 16px", borderRadius: "12px", background: "#EFEAFF", color: "#2C1790", fontWeight: "700", fontSize: "15px" }}>Dates</span>
<span style={{ padding: "10px 16px", borderRadius: "12px", background: "#D6FBFF", color: "#064E59", fontWeight: "700", fontSize: "15px" }}>Ticket types</span>
<span style={{ padding: "10px 16px", borderRadius: "12px", background: "#FFE3F3", color: "#8A1050", fontWeight: "700", fontSize: "15px" }}>Sponsors</span>
<span style={{ padding: "10px 16px", borderRadius: "12px", background: "#D6FBFF", color: "#064E59", fontWeight: "700", fontSize: "15px" }}>Performers</span>
<span style={{ padding: "10px 16px", borderRadius: "12px", background: "#FFE3F3", color: "#8A1050", fontWeight: "700", fontSize: "15px" }}>Contacts</span>
<span style={{ padding: "10px 16px", borderRadius: "12px", background: "#EFEAFF", color: "#2C1790", fontWeight: "700", fontSize: "15px" }}>Check-in</span>
</div>
<p style={{ margin: "auto 0 0", fontSize: "15px", color: "#5A5878" }}>Each tenant keeps its own gateway credentials. The gateway stays on that tenant.</p>
</div>
<div style={{ background: "#C9F8FF", border: "1px solid #E2E7EF", borderRadius: "24px", padding: "28px", display: "flex", flexDirection: "column", gap: "6px" }}>
<h3 style={{ margin: "0 0 8px", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "22px" }}>Payments on the same tenant</h3>
<div style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "14px 0", borderBottom: "1px solid rgba(21,19,46,0.16)" }}><span style={{ fontWeight: "700", fontSize: "17px" }}>Stripe</span><span style={{ color: "#5A5878", textAlign: "right" }}>Tickets and memberships</span></div>
<div style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "14px 0", borderBottom: "1px solid rgba(21,19,46,0.16)" }}><span style={{ fontWeight: "700", fontSize: "17px" }}>Givebutter</span><span style={{ color: "#5A5878", textAlign: "right" }}>Donations</span></div>
<div style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "14px 0", borderBottom: "1px solid rgba(21,19,46,0.16)" }}><span style={{ fontWeight: "700", fontSize: "17px" }}>Razorpay</span><span style={{ color: "#5A5878", textAlign: "right" }}>India school fees</span></div>
<div style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "14px 0" }}><span style={{ fontWeight: "700", fontSize: "17px" }}>Zelle, cash, check</span><span style={{ color: "#5A5878", textAlign: "right" }}>Manual, where enabled</span></div>
</div>
</div>
</div>
</section>

{/* MEDIA */}
<section id="media" style={{ padding: "72px 0 24px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px", alignItems: "center" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "20px", color: "#FFFFFF" }}>
<span style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#19E6FF" }}>Media</span>
<h2 style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(30px, 3.6vw, 46px)", lineHeight: "1.08", letterSpacing: "-0.025em", color: "#FFFFFF" }}>Media that keeps the homepage current.</h2>
<div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "18px 24px" }}>
<div><div style={{ fontWeight: "700", fontSize: "17px" }}>Galleries</div><div style={{ fontSize: "15px", color: "#DDD7F7" }}>Staff upload in the dashboard.</div></div>
<div><div style={{ fontWeight: "700", fontSize: "17px" }}>Event photos</div><div style={{ fontSize: "15px", color: "#DDD7F7" }}>Public pages pick them up.</div></div>
<div><div style={{ fontWeight: "700", fontSize: "17px" }}>Sponsor banners</div><div style={{ fontSize: "15px", color: "#DDD7F7" }}>Searchable by the words on the picture.</div></div>
<div><div style={{ fontWeight: "700", fontSize: "17px" }}>Homepage hero</div><div style={{ fontSize: "15px", color: "#DDD7F7" }}>Cycles through current images.</div></div>
</div>
<p style={{ margin: "0", fontSize: "15px", color: "#DDD7F7" }}>Same media tools on keralacenter.org, the sports site, and the school gallery.</p>
</div>
<div style={{ background: "#E6DEFF", border: "1.5px solid #15132E", borderRadius: "24px", padding: "22px", display: "flex", flexDirection: "column", gap: "16px", boxShadow: "7px 7px 0 #19E6FF" }}>
<span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A5878" }}>Search a sponsor by the words on the banner</span>
<div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", borderRadius: "14px", background: "#FFFFFF", border: "2px solid #5B2EFF", boxShadow: "0 0 0 4px rgba(91,46,255,0.12)" }}>
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5A5878" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>
<span style={{ fontSize: "17px", fontWeight: "600" }}>AI-based solutions</span>
<span style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: "999px", background: "#D6FBFF", color: "#064E59", fontSize: "12px", fontWeight: "700" }}>1 match</span>
</div>
<div role="img" aria-label="Illustrated Giventa sponsor banner with the words Providing AI-based solutions outlined as recognized text" style={{ position: "relative", borderRadius: "16px", background: "#5B2EFF", padding: "28px 26px 30px", display: "flex", flexDirection: "column", gap: "16px", overflow: "hidden" }}>
<span style={{ position: "absolute", right: "-40px", top: "-40px", width: "180px", height: "180px", borderRadius: "50%", border: "2px solid #19E6FF", boxShadow: "0 0 24px rgba(25,230,255,0.9), inset 0 0 24px rgba(25,230,255,0.5)" }}></span>
<span style={{ position: "absolute", right: "30px", bottom: "-50px", width: "120px", height: "120px", borderRadius: "28px", border: "2px solid #FF8AD0", boxShadow: "0 0 22px rgba(255,138,208,0.9)", transform: "rotate(18deg)" }}></span>
<div style={{ position: "relative", alignSelf: "flex-start", padding: "8px 14px", borderRadius: "12px", background: "#FFFFFF", border: "1.5px solid #15132E" }}>
<img src="/images/adwiise-agent/giventa-logo.png" alt="Giventa" style={{ display: "block", height: "38px", width: "auto" }} />
</div>
<div style={{ position: "relative", alignSelf: "flex-start", padding: "8px 12px", border: "2px dashed #19E6FF", borderRadius: "10px", boxShadow: "0 0 16px rgba(25,230,255,0.7)" }}>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(22px, 2.6vw, 32px)", lineHeight: "1.1", color: "#FFFFFF" }}>Providing AI-based solutions</span>
<span style={{ position: "absolute", left: "10px", top: "-13px", padding: "2px 8px", borderRadius: "999px", background: "#19E6FF", color: "#15132E", fontSize: "11px", fontWeight: "700" }}>Text read from image</span>
</div>
<span style={{ position: "relative", fontSize: "15px", fontWeight: "600", color: "#FFFFFF" }}>www.giventa.com</span>
</div>
<p style={{ margin: "0", fontSize: "15px", color: "#4F4D72" }}><strong style={{ color: "#15132E" }}>Giventa banner.</strong> Image text is read from banners, so a visitor can find the sponsor from the words on the picture.</p>
</div>
</div>
</section>

{/* LIVE SITES */}
<section id="live-sites" style={{ padding: "72px 0 24px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", gap: "28px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "760px" }}>
<span style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#19E6FF" }}>Sites already live</span>
<h2 style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(30px, 3.6vw, 46px)", lineHeight: "1.08", letterSpacing: "-0.025em", color: "#FFFFFF" }}>Four live sites. Click any one.</h2>
</div>
<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "18px" }}>
<a href="https://www.keralacenter.org/" style={{ textDecoration: "none", color: "#15132E", background: "#FFF3B8", border: "1px solid #E2E7EF", borderRadius: "20px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
<span aria-hidden="true" style={{ height: "150px", display: "flex", background: "#D6FBFF", padding: "18px 22px 0", boxSizing: "border-box" }}><span style={{ flex: "1 1 auto", background: "#FFFFFF", border: "1.5px solid #15132E", borderBottom: "0", borderRadius: "12px 12px 0 0", padding: "10px 12px 0", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "8px" }}>
<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "14px", height: "14px", borderRadius: "5px", background: "#5B2EFF" }}></span><span style={{ width: "46px", height: "5px", borderRadius: "3px", background: "#CBD3E0" }}></span><span style={{ marginLeft: "auto", width: "30px", height: "12px", borderRadius: "999px", background: "#15132E" }}></span></span>
<span style={{ flex: "1 1 auto", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px" }}><span style={{ borderRadius: "6px", background: "#19E6FF" }}></span><span style={{ borderRadius: "6px", background: "#EFEAFF" }}></span><span style={{ borderRadius: "6px", background: "#FF8AD0" }}></span><span style={{ borderRadius: "6px", background: "#EFEAFF" }}></span><span style={{ borderRadius: "6px 6px 0 0", background: "#EFEAFF" }}></span><span style={{ borderRadius: "6px 6px 0 0", background: "#9D8CFF" }}></span><span style={{ borderRadius: "6px 6px 0 0", background: "#D6FBFF" }}></span><span style={{ borderRadius: "6px 6px 0 0", background: "#19E6FF" }}></span></span>
</span></span>
<span style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 auto" }}>
<span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A5878" }}>Community and cultural</span>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "22px" }}>Kerala Center</span>
<span style={{ fontSize: "15px", color: "#4F4D72" }}>Parsippany Malayali community. Events, sponsors, galleries, public homepage. Designed and developed by Giventa Inc.</span>
<span style={{ marginTop: "auto", paddingTop: "8px", fontWeight: "700", color: "#4A21E0" }}>keralacenter.org →</span>
</span>
</a>
<a href="https://www.md-strikers.com/" style={{ textDecoration: "none", color: "#15132E", background: "#C9F8FF", border: "1px solid #E2E7EF", borderRadius: "20px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
<span aria-hidden="true" style={{ height: "150px", display: "flex", background: "#FFE3F3", padding: "18px 22px 0", boxSizing: "border-box" }}><span style={{ flex: "1 1 auto", background: "#FFFFFF", border: "1.5px solid #15132E", borderBottom: "0", borderRadius: "12px 12px 0 0", padding: "10px 12px 0", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "9px" }}>
<span style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ width: "14px", height: "14px", borderRadius: "50%", background: "#FF3DA6" }}></span><span style={{ width: "46px", height: "5px", borderRadius: "3px", background: "#CBD3E0" }}></span><span style={{ marginLeft: "auto", width: "30px", height: "12px", borderRadius: "999px", background: "#15132E" }}></span></span>
<span style={{ display: "flex", gap: "8px" }}><span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#19E6FF", border: "1.5px solid #15132E" }}></span><span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#EFEAFF", border: "1.5px solid #15132E" }}></span><span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#FF8AD0", border: "1.5px solid #15132E" }}></span><span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#9D8CFF", border: "1.5px solid #15132E" }}></span><span style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#D6FBFF", border: "1.5px solid #15132E" }}></span></span>
<span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ width: "16px", height: "6px", borderRadius: "3px", background: "#5B2EFF" }}></span><span style={{ flex: "1 1 auto", height: "6px", borderRadius: "3px", background: "#E8ECF2" }}></span><span style={{ width: "26px", height: "6px", borderRadius: "3px", background: "#19E6FF" }}></span></span>
<span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ width: "16px", height: "6px", borderRadius: "3px", background: "#5B2EFF" }}></span><span style={{ flex: "1 1 auto", height: "6px", borderRadius: "3px", background: "#E8ECF2" }}></span><span style={{ width: "26px", height: "6px", borderRadius: "3px", background: "#FF8AD0" }}></span></span>
<span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ width: "16px", height: "6px", borderRadius: "3px", background: "#5B2EFF" }}></span><span style={{ flex: "1 1 auto", height: "6px", borderRadius: "3px", background: "#E8ECF2" }}></span><span style={{ width: "26px", height: "6px", borderRadius: "3px", background: "#9D8CFF" }}></span></span>
</span></span>
<span style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 auto" }}>
<span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A5878" }}>Sports team</span>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "22px" }}>MD Strikers</span>
<span style={{ fontSize: "15px", color: "#4F4D72" }}>Roster, leagues, tournaments, events, and gallery.</span>
<span style={{ marginTop: "auto", paddingTop: "8px", fontWeight: "700", color: "#4A21E0" }}>md-strikers.com →</span>
</span>
</a>
<a href="https://www.mcefee-temp.com/" style={{ textDecoration: "none", color: "#15132E", background: "#FFD9EE", border: "1px solid #E2E7EF", borderRadius: "20px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
<span aria-hidden="true" style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", background: "#EFEAFF", padding: "0 22px", boxSizing: "border-box" }}><span style={{ width: "100%", maxWidth: "250px", height: "92px", display: "flex", background: "#FFFFFF", border: "1.5px solid #15132E", borderRadius: "14px", boxShadow: "5px 5px 0 #19E6FF", transform: "rotate(-4deg)" }}>
<span style={{ flex: "1 1 auto", padding: "14px", display: "flex", flexDirection: "column", gap: "8px" }}><span style={{ width: "70%", height: "9px", borderRadius: "5px", background: "#15132E" }}></span><span style={{ width: "90%", height: "6px", borderRadius: "3px", background: "#CBD3E0" }}></span><span style={{ width: "50%", height: "6px", borderRadius: "3px", background: "#CBD3E0" }}></span><span style={{ marginTop: "auto", width: "54px", height: "16px", borderRadius: "999px", background: "#5B2EFF" }}></span></span>
<span style={{ flex: "0 0 70px", borderLeft: "2px dashed #15132E", display: "grid", gridTemplateColumns: "repeat(3, 12px)", gridAutoRows: "12px", gap: "4px", alignContent: "center", justifyContent: "center" }}><span style={{ background: "#15132E" }}></span><span style={{ background: "#FF3DA6" }}></span><span style={{ background: "#15132E" }}></span><span style={{ background: "#19E6FF" }}></span><span style={{ background: "#15132E" }}></span><span style={{ background: "#15132E" }}></span><span style={{ background: "#15132E" }}></span><span style={{ background: "#9D8CFF" }}></span><span style={{ background: "#15132E" }}></span></span>
</span></span>
<span style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 auto" }}>
<span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A5878" }}>Cultural events and ticketing</span>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "22px" }}>MCEFEE</span>
<span style={{ fontSize: "15px", color: "#4F4D72" }}>Event listings, ticketing, media, and community pages.</span>
<span style={{ marginTop: "auto", paddingTop: "8px", fontWeight: "700", color: "#4A21E0" }}>mcefee-temp.com →</span>
</span>
</a>
<a href="https://www.bst-school-demo.com" style={{ textDecoration: "none", color: "#15132E", background: "#E6DEFF", border: "1px solid #E2E7EF", borderRadius: "20px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
<span aria-hidden="true" style={{ height: "150px", display: "flex", background: "#E3F0FF", padding: "18px 22px 0", boxSizing: "border-box" }}><span style={{ flex: "1 1 auto", background: "#FFFFFF", border: "1.5px solid #15132E", borderBottom: "0", borderRadius: "12px 12px 0 0", boxSizing: "border-box", display: "flex" }}>
<span style={{ flex: "0 0 34%", borderRight: "1.5px solid #15132E", padding: "12px 10px", display: "flex", flexDirection: "column", gap: "8px" }}><span style={{ height: "7px", borderRadius: "4px", background: "#5B2EFF" }}></span><span style={{ height: "7px", borderRadius: "4px", background: "#DDE3EC" }}></span><span style={{ height: "7px", borderRadius: "4px", background: "#DDE3EC" }}></span><span style={{ height: "7px", borderRadius: "4px", background: "#DDE3EC" }}></span><span style={{ height: "7px", width: "60%", borderRadius: "4px", background: "#DDE3EC" }}></span></span>
<span style={{ flex: "1 1 auto", padding: "12px", display: "flex", flexDirection: "column", gap: "9px" }}><span style={{ width: "55%", height: "9px", borderRadius: "5px", background: "#15132E" }}></span>
<span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ flex: "1 1 auto", height: "6px", borderRadius: "3px", background: "#E8ECF2" }}></span><span style={{ width: "30px", height: "12px", borderRadius: "999px", background: "#19E6FF" }}></span></span>
<span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ flex: "1 1 auto", height: "6px", borderRadius: "3px", background: "#E8ECF2" }}></span><span style={{ width: "30px", height: "12px", borderRadius: "999px", background: "#FF8AD0" }}></span></span>
<span style={{ display: "flex", alignItems: "center", gap: "8px" }}><span style={{ flex: "1 1 auto", height: "6px", borderRadius: "3px", background: "#E8ECF2" }}></span><span style={{ width: "30px", height: "12px", borderRadius: "999px", background: "#19E6FF" }}></span></span>
</span>
</span></span>
<span style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "8px", flex: "1 1 auto" }}>
<span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A5878" }}>School template</span>
<span style={{ fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "22px" }}>School template</span>
<span style={{ fontSize: "15px", color: "#4F4D72" }}>Staff, departments, facilities, activities, pages, highlights, news, events, gallery, downloads, fee invoices.</span>
<span style={{ marginTop: "auto", paddingTop: "8px", fontWeight: "700", color: "#4A21E0" }}>bst-school-demo.com →</span>
</span>
</a>
</div>
</div>
</section>

{/* SERVICES */}
<section style={{ padding: "72px 0 24px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" }}>
<div style={{ display: "flex", flexDirection: "column", gap: "18px", color: "#FFFFFF" }}>
<div style={{ alignSelf: "flex-start", padding: "10px 16px", borderRadius: "14px", background: "#FFFFFF", boxShadow: "5px 5px 0 #19E6FF" }}>
<img src="/images/adwiise-agent/giventa-logo.png" alt="Giventa" style={{ display: "block", height: "44px", width: "auto" }} />
</div>
<span style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#19E6FF" }}>Software services from Giventa</span>
<h2 style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(30px, 3.6vw, 46px)", lineHeight: "1.08", letterSpacing: "-0.025em", color: "#FFFFFF" }}>We build the platform. We run your site.</h2>
<p style={{ margin: "0", fontSize: "18px", color: "#DDD7F7" }}>Giventa Inc builds and operates the platform, then delivers customer sites as a service. The customer gets a finished site and a dashboard.</p>
<p style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "600", fontSize: "20px" }}>“Providing AI-based solutions.”</p>
</div>
<div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
<div style={{ background: "#FFD9EE", border: "1px solid #E2E7EF", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
<span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A5878" }}>One multi-modal system</span>
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
<span style={{ padding: "8px 14px", borderRadius: "999px", border: "1.5px solid #9D8CFF", fontWeight: "600", fontSize: "14px" }}>Community websites</span>
<span style={{ padding: "8px 14px", borderRadius: "999px", border: "1.5px solid #19E6FF", fontWeight: "600", fontSize: "14px" }}>Sports sites</span>
<span style={{ padding: "8px 14px", borderRadius: "999px", border: "1.5px solid #FF8AD0", fontWeight: "600", fontSize: "14px" }}>Event ticketing</span>
<span style={{ padding: "8px 14px", borderRadius: "999px", border: "1.5px solid #19E6FF", fontWeight: "600", fontSize: "14px" }}>School operations</span>
<span style={{ padding: "8px 14px", borderRadius: "999px", border: "1.5px solid #FF8AD0", fontWeight: "600", fontSize: "14px" }}>Church presence</span>
<span style={{ padding: "8px 14px", borderRadius: "999px", border: "1.5px solid #9D8CFF", fontWeight: "600", fontSize: "14px" }}>Retail operator tools</span>
</div>
</div>
<div style={{ background: "#C9F8FF", border: "1px solid #E2E7EF", borderRadius: "20px", padding: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
<span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.08em", textTransform: "uppercase", color: "#5A5878" }}>Giventa’s service</span>
<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
<span style={{ padding: "8px 14px", borderRadius: "10px", background: "#FFFFFF", fontWeight: "700", fontSize: "14px" }}>Setup</span>
<span style={{ padding: "8px 14px", borderRadius: "10px", background: "#FFFFFF", fontWeight: "700", fontSize: "14px" }}>Site type</span>
<span style={{ padding: "8px 14px", borderRadius: "10px", background: "#FFFFFF", fontWeight: "700", fontSize: "14px" }}>Domain</span>
<span style={{ padding: "8px 14px", borderRadius: "10px", background: "#FFFFFF", fontWeight: "700", fontSize: "14px" }}>Payments</span>
<span style={{ padding: "8px 14px", borderRadius: "10px", background: "#FFFFFF", fontWeight: "700", fontSize: "14px" }}>Ongoing operation</span>
</div>
</div>
</div>
</div>
</section>

{/* CTA */}
<section style={{ padding: "72px 0 64px" }}>
<div style={{ maxWidth: "1240px", margin: "0 auto", padding: "0 24px" }}>
<div style={{ background: "#FFF3B8", border: "1.5px solid #15132E", borderRadius: "28px", padding: "clamp(28px, 5vw, 56px)", display: "flex", flexWrap: "wrap", gap: "32px", alignItems: "center", justifyContent: "space-between", boxShadow: "9px 9px 0 #19E6FF, 18px 18px 0 #15132E" }}>
<div style={{ flex: "1 1 380px", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
<span style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.1em", textTransform: "uppercase", color: "#5B2EFF" }}>Let’s talk</span>
<h2 style={{ margin: "0", fontFamily: "'Sora', sans-serif", fontWeight: "700", fontSize: "clamp(32px, 4.2vw, 54px)", lineHeight: "1.05", letterSpacing: "-0.03em" }}>Your next site is a configuration.</h2>
<p style={{ margin: "0", fontSize: "18px", color: "#4F4D72" }}>One dashboard. Many site types. A public site on the customer’s own domain.</p>
</div>
<div style={{ flex: "0 1 340px", display: "flex", flexDirection: "column", gap: "14px", alignItems: "flex-start" }}>
<div style={{ padding: "8px 14px", borderRadius: "12px", background: "#FFFFFF", border: "1.5px solid #15132E" }}>
<img src="/images/adwiise-agent/giventa-logo.png" alt="Giventa" style={{ display: "block", height: "36px", width: "auto" }} />
</div>
<a href="mailto:sales@giventa.com" style={{ display: "inline-flex", alignItems: "center", minHeight: "52px", padding: "0 26px", borderRadius: "14px", background: "#5B2EFF", color: "#FFFFFF", fontWeight: "700", fontSize: "17px", textDecoration: "none", boxShadow: "5px 5px 0 #FF8AD0" }}>sales@giventa.com</a>
<HubEntryButton variant="outline" />
<p style={{ margin: "0", fontSize: "15px", color: "#4F4D72" }}>Also: <a href="mailto:info@giventa.com">info@giventa.com</a> · <a href="tel:+18628124371">+1 (862) 812-4371</a></p>
</div>
</div>
</div>
</section>
    </div>
  );
}
