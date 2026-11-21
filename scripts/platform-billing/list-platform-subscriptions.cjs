// Read-only check of what Stripe test mode holds for platform billing.
// Lists every subscription and saved card on the customers that opened a platform checkout recently.
// Run from the repo root:
//   node scripts/platform-billing/list-platform-subscriptions.cjs
const fs = require('fs');
const path = require('path');
const Stripe = require('stripe');

const ROOT = path.resolve(__dirname, '..', '..');
const found = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').match(/^\s*STRIPE_SECRET_KEY\s*=\s*"?([^"\r\n]+)/m);
const key = found ? found[1].trim() : '';
if (!key.startsWith('sk_test_')) throw new Error('Refusing to run: STRIPE_SECRET_KEY in .env.local is not a test key.');

(async () => {
  const stripe = new Stripe(key);
  const sessions = await stripe.checkout.sessions.list({ limit: 50 });
  const customers = [
    ...new Set(
      sessions.data
        .filter((session) => session.metadata && session.metadata.billingScope === 'platform_tenant' && session.customer)
        .map((session) => session.customer)
    ),
  ];
  for (const customer of customers) {
    // A customer deleted in Stripe still appears on its old checkout sessions.
    const record = await stripe.customers.retrieve(customer).catch(() => null);
    if (!record || record.deleted) continue;
    const subscriptions = await stripe.subscriptions.list({ customer, status: 'all', limit: 20 });
    const cards = await stripe.paymentMethods.list({ customer, type: 'card' });
    if (!subscriptions.data.length && !cards.data.length) continue;
    console.log(`customer ${customer}`);
    for (const subscription of subscriptions.data) {
      const item = subscription.items.data[0];
      const price = item.price;
      const meta = subscription.metadata || {};
      // A graduated price has no single unit amount. Its tiers decide the total.
      const amount = price.unit_amount != null ? `$${(price.unit_amount / 100).toFixed(2)}` : 'graduated';
      console.log(
        `  ${subscription.id}  ${subscription.status}  ${amount} per ${price.recurring ? price.recurring.interval : 'once'}  quantity=${item.quantity}  ${meta.product || '-'}  billingId=${meta.billingId || '-'}  tenant=${meta.tenantId || '-'}`
      );
    }
    for (const card of cards.data) {
      console.log(`  card ${card.card.brand} ${card.card.last4}  allow_redisplay=${card.allow_redisplay}`);
    }
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
