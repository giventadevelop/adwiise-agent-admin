// Makes a platform subscription renew now in Stripe test mode, with a card that fails or one that works.
// A declined card on Checkout creates no invoice, so this is the way to see a failed renewal locally.
// Run from the repo root:
//   node scripts/platform-billing/simulate-renewal.cjs --subscription=sub_... --card=fail
//   node scripts/platform-billing/simulate-renewal.cjs --subscription=sub_... --card=ok
// --card=fail puts Stripe's failing test card on the subscription and bills it now. The invoice stays open.
// --card=ok puts the working test card back and pays the open invoice.
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

const subscriptionId = arg('subscription', '');
const card = arg('card', 'fail');
if (!subscriptionId.startsWith('sub_')) throw new Error('Pass --subscription=sub_...');
if (card !== 'fail' && card !== 'ok') throw new Error('--card must be fail or ok.');

// Stripe test payment methods. The first attaches to a customer and then fails every charge.
const TEST_CARD = { fail: 'pm_card_chargeCustomerFail', ok: 'pm_card_visa' };

(async () => {
  const stripe = new Stripe(key);
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (subscription.metadata?.billingScope !== 'platform_tenant') {
    throw new Error('This subscription is not a platform billing subscription.');
  }
  const customer = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const method = await stripe.paymentMethods.attach(TEST_CARD[card], { customer });
  await stripe.subscriptions.update(subscriptionId, { default_payment_method: method.id });
  console.log(`Subscription ${subscriptionId} now pays with ${method.card.brand} ${method.card.last4}.`);

  if (card === 'fail') {
    // Starting a new billing period now makes Stripe bill at once. The charge fails and the invoice stays open.
    await stripe.subscriptions
      .update(subscriptionId, { billing_cycle_anchor: 'now', proration_behavior: 'none' })
      .catch((error) => console.log(`Stripe answered: ${error.message}`));
  } else {
    const open = await stripe.invoices.list({ subscription: subscriptionId, status: 'open', limit: 10 });
    for (const invoice of open.data) {
      const paid = await stripe.invoices.pay(invoice.id, { payment_method: method.id });
      console.log(`Invoice ${paid.id} is ${paid.status}.`);
    }
    if (!open.data.length) console.log('There was no open invoice to pay.');
    // The failing test card is taken off the customer, so Checkout does not offer it as a saved card.
    const cards = await stripe.paymentMethods.list({ customer, type: 'card' });
    for (const saved of cards.data) {
      if (saved.card.last4 === '0341') await stripe.paymentMethods.detach(saved.id);
    }
  }
  const after = await stripe.subscriptions.retrieve(subscriptionId);
  console.log(`Subscription status in Stripe: ${after.status}.`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
