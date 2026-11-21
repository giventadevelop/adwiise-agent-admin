// Creates the Stripe graduated price for a per-location retail plan, in test mode only.
// The price id it prints goes into "Stripe price id" on that plan at /admin/platform-billing/plans.
// Run from the repo root:
//   node scripts/platform-billing/create-graduated-price.cjs
//   node scripts/platform-billing/create-graduated-price.cjs --interval=month --tiers="3:199,10:149,inf:99" --name="Gas station locations"
// --tiers is a list of "last location in the tier : dollars per location". "inf" is the last tier.
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const ROOT = path.resolve(__dirname, '..', '..');

function arg(name, fallback) {
  const hit = process.argv.find((entry) => entry.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

const found = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(/^\s*STRIPE_SECRET_KEY\s*=\s*"?([^"\r\n]+)/m);
const key = found ? found[1].trim() : '';
if (!key.startsWith('sk_test_')) throw new Error('Refusing to run: STRIPE_SECRET_KEY in .env.local is not a test key.');

const interval = arg('interval', 'month');
if (!['day', 'week', 'month', 'year'].includes(interval)) throw new Error('--interval must be day, week, month or year.');
const name = arg('name', 'Gas station locations');
const tiers = arg('tiers', '3:199,10:149,inf:99')
  .split(',')
  .map((entry) => {
    const [upTo, dollars] = entry.split(':').map((part) => part.trim());
    const amount = Number(dollars);
    if (!upTo || !Number.isFinite(amount) || amount < 0) throw new Error(`Cannot read the tier "${entry}".`);
    return { up_to: upTo === 'inf' ? 'inf' : Number(upTo), unit_amount: Math.round(amount * 100) };
  });
if (tiers[tiers.length - 1].up_to !== 'inf') throw new Error('The last tier must be "inf".');

(async () => {
  const stripe = new Stripe(key);
  const price = await stripe.prices.create({
    currency: 'usd',
    billing_scheme: 'tiered',
    tiers_mode: 'graduated',
    tiers,
    recurring: { interval, usage_type: 'licensed' },
    product_data: { name },
    metadata: { billingScope: 'platform_tenant', createdBy: 'create-graduated-price.cjs' },
  });
  console.log(`Stripe price id: ${price.id}`);
  for (const tier of tiers) {
    console.log(`  up to ${tier.up_to}: $${(tier.unit_amount / 100).toFixed(2)} per location per ${interval}`);
  }
  console.log('Paste the price id into "Stripe price id" on the plan, then click Update plan.');
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
