// Single source of truth for the ad's timing. All values are seconds.
// Voiceover start times are placed so each line has a pause before the next;
// cue offsets inside a line come from measured pauses in the recorded audio.

export const FPS = 30;
export const END = 58.4;
export const DURATION_FRAMES = Math.round(END * FPS);

export const VO = [
  { file: 'vo-01.mp3', start: 0.6, dur: 2.51, text: 'A new website used to take a season.' },
  { file: 'vo-02.mp3', start: 4.0, dur: 3.97, text: 'Its own design. Hosting. Payments. Maintenance.' },
  { file: 'vo-03.mp3', start: 8.55, dur: 6.19, text: 'Sixteen to twenty weeks. Then the next organization starts all over again.' },
  { file: 'vo-04.mp3', start: 15.75, dur: 3.47, text: 'Adwiise AI Agent changes that.' },
  { file: 'vo-05.mp3', start: 20.1, dur: 2.69, text: 'Many sites. One platform.' },
  { file: 'vo-06.mp3', start: 23.4, dur: 6.53, text: 'Onboard a tenant. Brand it. Publish on their own domain. In days, not months.' },
  { file: 'vo-07.mp3', start: 31.0, dur: 6.11, text: 'Already live: community sites, sports teams, events, and schools.' },
  { file: 'vo-08.mp3', start: 39.91, dur: 7.71, text: 'Sell tickets. Collect fees. Take donations. Manage media. All from one dashboard.' },
  { file: 'vo-09.mp3', start: 48.82, dur: 2.77, text: 'Your next site is a configuration.' },
  { file: 'vo-10.mp3', start: 52.49, dur: 3.55, text: 'Visit adwiiseagent.ai.' },
];

export const SCENES = [
  { id: 'hook', label: 'Hook', start: 0, end: 3.55, onScreen: 'A new website used to take a season.' },
  { id: 'pain', label: 'Pain', start: 3.55, end: 15.25, onScreen: 'Its own design / hosting / payments / maintenance · 16–20 weeks · Then the next organization starts over.' },
  { id: 'brand', label: 'Turn (brand reveal)', start: 15.25, end: 19.65, onScreen: 'Adwiise AI Agent · by Giventa Inc · changes that.' },
  { id: 'solution', label: 'Solution', start: 19.65, end: 30.5, onScreen: 'Many sites. One platform. · Onboard → Approve → Site type + domain → Brand → Publish · On their own domain. In days, not months.' },
  { id: 'proof', label: 'Proof montage', start: 30.5, end: 39.45, onScreen: 'Four sites. Already live. · Kerala Center, MD Strikers, MCEFEE, School template (with URLs) · Site types: Community, Sports, Church, School, Events, Retail' },
  { id: 'benefits', label: 'Benefits', start: 39.45, end: 48.3, onScreen: 'Sell tickets · Collect fees · Take donations · Manage media · Stripe, Givebutter, Razorpay · All from one dashboard.' },
  { id: 'close', label: 'Closing line', start: 48.3, end: 52.0, onScreen: 'Your next site is a configuration.' },
  { id: 'end', label: 'CTA end card', start: 52.0, end: END, onScreen: 'Adwiise AI Agent by Giventa Inc · adwiiseagent.ai · sales@giventa.com · +1 (312) 343-0073 · New Jersey, USA' },
];

export const scene = (id) => SCENES.find((s) => s.id === id);
