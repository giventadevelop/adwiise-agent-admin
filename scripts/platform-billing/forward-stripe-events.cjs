// Stand-in for `stripe listen` when the Stripe CLI cannot connect.
// Fetches recent test-mode Stripe events and posts them, signed, to the local webhook.
// Run from the repo root:
//   node scripts/platform-billing/forward-stripe-events.cjs --minutes=15 --port=3001
// Each event is sent once. The list of sent event ids is kept in the system temp folder.
const fs = require('fs');
const os = require('os');
const path = require('path');
const Stripe = require('stripe');

const ROOT = path.resolve(__dirname, '..', '..');

function arg(name, fallback) {
  const hit = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const env = {};
for (const line of fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, '');
}
const key = env.STRIPE_SECRET_KEY;
const secret = env.STRIPE_WEBHOOK_SECRET;
if (!key || !key.startsWith('sk_test_')) throw new Error('Refusing to run: STRIPE_SECRET_KEY in .env.local is not a test key.');
if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is missing from .env.local.');

// Only the event types the platform billing webhook acts on.
const TYPES = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.deleted',
];

const minutes = Number(arg('minutes', '15'));
const port = arg('port', '3001');
const seenFile = path.join(os.tmpdir(), 'adwiise-platform-billing-forwarded-events.json');
const seen = fs.existsSync(seenFile) ? JSON.parse(fs.readFileSync(seenFile, 'utf8')) : [];

(async () => {
  const stripe = new Stripe(key);
  const since = Math.floor(Date.now() / 1000) - minutes * 60;
  const list = await stripe.events.list({ created: { gte: since }, types: TYPES, limit: 100 });
  const events = list.data.filter((event) => !seen.includes(event.id)).sort((a, b) => a.created - b.created);
  for (const event of events) {
    const payload = JSON.stringify(event);
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const response = await fetch(`http://localhost:${port}/api/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': header },
      body: payload,
    });
    const text = (await response.text()).slice(0, 120);
    const meta = event.data.object.metadata || {};
    console.log(`${event.type} ${event.data.object.id} billingId=${meta.billingId || '-'} product=${meta.product || '-'} -> ${response.status} ${text}`);
    if (response.ok) seen.push(event.id);
  }
  fs.writeFileSync(seenFile, JSON.stringify(seen.slice(-2000)));
  console.log(`Forwarded ${events.length} event(s) from the last ${minutes} minute(s).`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
