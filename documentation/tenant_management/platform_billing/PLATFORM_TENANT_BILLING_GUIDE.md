# Tenant platform billing guide

This guide explains, in plain English, how event-site tenants and gas-station tenants pay to use this platform. It is the reference for the build described in [BUILD_PLAN.md](BUILD_PLAN.md). The payment-system choice is explained in [STRIPE_VS_ZOHO_ANALYSIS.md](STRIPE_VS_ZOHO_ANALYSIS.md).

Charging is live. A platform super-admin turns the charge switch on, and the paying admin opens Pay on `/admin/billing`. Stripe Checkout collects the card. The charge ledger is `/admin/platform-billing`.

## 1. Two different kinds of money

This platform already takes two kinds of payments. This guide adds a third. Keep them separate.

**Ticket money.** A guest buys a ticket for an event. The existing desktop Checkout and mobile Apple Pay / Google Pay flows handle that. Those flows save a ticket transaction and show a success page. Do not change them to bill the tenant.

**Membership money.** A person joins a membership that renews. The existing membership subscription flows save a Stripe subscription id for that person. Do not use those tables, those success pages, or the Payment Request Button for tenant fees.

**Platform money (this guide).** The organization that runs the event site, or the owner that runs the gas stations, pays us for the software. One Stripe customer per tenant organization. Event-site fees and gas-station fees are billed as separate products so a hybrid tenant can be free on one and paying on the other.

The words “subscription” and “plan” already appear on the tenant admin form (Basic, Professional, Enterprise) and on membership pages. Those words are labels today. They are not a live bill.

## 2. What the tenant is buying

A tenant can be on one or both products:

- **Event site.** A flat fee for the event website (events, tickets, members, and the admin tools that go with them).
- **Gas station.** A fee that normally grows with the number of locations included in the bill. One subscription for the whole chain, not one subscription per store.

For each product the tenant can be offered:

- A **catalog plan** with a published price (for example Starter, Standard, or a gas-station per-location rate).
- A **custom fee** typed by a platform admin for that tenant only. The catalog price is ignored for that tenant when a custom fee is set.
- **Recurring** billing (every month or every year) or a **one-time** payment, when the plan allows that choice.
- A **long free period**. The tenant uses the product with no card on file until a person turns charging on. A reminder date does not start a charge by itself.

## 3. The charge switch

This is the main rule.

1. When a tenant is created, the charge switch for each product is **off**.
2. While the switch is off, the tenant uses that product freely. No Stripe customer is required. No invoice is created. No card is stored.
3. Only a **platform super-admin** can turn the switch on. The tenant cannot turn it on, and a reminder date cannot turn it on.
4. The admin may set a **review-by date** (30 days, 90 days, 180 days, or any date they type). That date is a reminder on the admin screen. It does not charge the tenant.
5. When the admin turns the switch on, the tenant must choose how to pay (or pay the custom amount the admin already set). They get a **grace period** (a number of days the admin sets, default 14) to finish payment. During grace, access stays open.
6. If grace ends and there is still no successful payment, the paid admin tools for that product stop. The tenant’s public site and stored data stay in place. A pay page explains what to do.
7. Turning the switch **off** again stops future charges. It does not delete the tenant. If a Stripe subscription is already running, turning the switch off cancels that subscription at the end of the period already paid (or immediately, if the admin chooses “stop now” and confirms).

Status words to show in the admin screen:

- **Complimentary** — switch off, using the product for free.
- **Payment due** — switch on, still inside grace, no successful payment yet.
- **Active** — switch on and paid (recurring subscription in good standing, or one-time payment still inside its paid-through date).
- **Past due** — a renewal failed and Stripe is still retrying.
- **Locked** — switch on, grace over, not paid. Paid tools are blocked.

## 4. Plans the tenant can choose

A platform super-admin keeps a small catalog. Each plan has:

- A name people can read (Starter, Standard, Gas station locations).
- Which product it belongs to: event site or gas station.
- Whether it is recurring, one-time, or both.
- For recurring: every month or every year.
- The list price in US dollars.
- For gas stations that use location pricing: the per-location rates by count (see section 6). A flat custom fee skips those rates.
- A short list of what the plan includes, shown on the choose-a-plan page.
- Whether the plan is published. Unpublished plans are hidden from tenants. An admin can still assign one.

The tenant sees only published plans for products they actually have. A gas-station-only tenant does not see event-site plans.

Example catalog (prices are placeholders until the business sets them):

- Event site Starter — $49 per month, or a one-time setup fee the admin defines.
- Event site Standard — $149 per month.
- Event site Custom — no list price. The admin types the fee on that tenant.
- Gas station locations — graduated per location per month (section 6), or a custom flat monthly amount.

Yearly prices, when offered, are a separate published price on the same plan (for example ten months’ price paid once a year). The tenant picks monthly or yearly on the pay page when both exist.

## 5. A custom fee for one tenant

Some tenants will not pay the catalog price. A platform super-admin sets a custom amount on that tenant’s product:

- Custom monthly amount, or custom one-time amount, in US dollars, with cents (always stored and shown with two decimal places, such as 199.00).
- Optional note (“agreed March 2026, includes 12 locations”).
- The catalog plan name can still be shown so support knows which feature set they bought. The **amount charged** is the custom amount.

When the tenant pays, Stripe gets a price that exists only for that tenant. Other tenants keep the shared catalog price.

If the admin later changes the custom amount:

- Recurring: the next invoice uses the new amount. The current period is not re-billed unless the admin also chooses “apply now,” which prorates.
- One-time already paid: the change does not create a second charge. It applies only if the admin sends a new one-time pay link.

## 6. Gas stations and location count

A gas-station tenant owns one or more locations. Billing follows these rules:

- One subscription for the tenant, not one subscription per store.
- The tenant (or the admin) marks which locations are included.
- The billable count is the number of locations that are active and included.
- The default price is graduated, so adding a location never makes the total bill go down:
  - 1 to 3 locations: $199 each per month.
  - 4 to 10 locations: $149 each per month for those extra locations.
  - 11 or more: $99 each per month for those extra locations.
- Example: 6 locations = (3 × $199) + (3 × $149) = $1,044 per month.
- These dollar amounts are placeholders. Put the real numbers in the catalog before the first live charge.
- A custom flat fee replaces this math for that tenant. Quantity is then ignored.
- Adding or removing an included location after they are subscribed changes the next invoice and prorates the current period.

The older note in the mosc-temp repo (`documentation/tenant_management/gas_station_site/gas_station_subscription_billing.md`) describes the same location idea. This folder is the one to follow, because it also covers event sites, the charge switch, and custom fees.

## 7. Recurring payment or one-time payment

The admin decides what a plan allows. The tenant chooses only among the allowed options.

**Recurring.** Stripe charges the card or US bank account on the schedule. The tenant can open the billing portal to change the card or bank account, see invoices, or cancel. Cancel means access continues until the end of the period already paid, unless the admin locks the product sooner.

**One-time.** Stripe charges once. We store a paid-through date (the admin sets the length, for example 12 months). There is no automatic second charge. Before the paid-through date, the admin can send a new pay link or turn the charge switch off and leave them complimentary.

Do not create a Stripe subscription for a one-time plan. A subscription always tries to charge again.

## 8. How they pay: card and bank

The pay page is Stripe’s hosted Checkout. We do not build a card form for this fee.

On that page the tenant can pay with:

- Credit or debit card.
- Apple Pay, Google Pay, or Link, when the device offers them.
- A US bank account (ACH debit), when the plan is charged in US dollars and the tenant’s bank is in the United States.

ACH is cheaper on large bills (about 0.8 percent, capped at $5, on Stripe’s published US pricing). A card is about 2.9 percent plus 30 cents, and an international card costs more. ACH is not instant: the bank can still return the payment for a few days. Until Stripe reports success, the status stays “payment due,” not “active.” Do not unlock a locked product on an ACH payment that is only “processing” unless the admin explicitly allows that.

Tenants outside the United States use a card (or a wallet). Do not offer ACH for a non-US bank account. Stripe can charge international cards on the same Checkout page. That is the international path. A separate Zoho (SOHO) account is not required for that.

After the first successful payment, the tenant manages the card or bank account in the Stripe Customer Portal. We do not store card numbers.

## 9. What the platform admin does

These steps are the operating procedure. The screens come in the build phases in [BUILD_PLAN.md](BUILD_PLAN.md).

1. Create the tenant the way onboarding already works. Both product switches stay off. Status is Complimentary.
2. If this tenant negotiated a price, open the tenant and type the custom fee and a short note. Leave the switch off.
3. Optionally set a review-by date so the admin list can show “review soon.”
4. When the business is ready to charge, turn the charge switch on for the event site, the gas stations, or both. Set the grace days (default 14).
5. Tell the tenant to open the billing page and pay. The page shows the catalog, or only the custom amount if one is set.
6. After they pay, confirm the status is Active and that the Stripe customer id and subscription id (or one-time payment id) are stored.
7. If a renewal fails, Stripe emails the tenant and retries. The admin list shows Past due. Do not build a second retry system.
8. To stop charging without deleting the tenant, turn the switch off and confirm whether the current period should finish or stop now.

Only a platform super-admin can change the switch, the custom fee, the catalog, or the grace days. A tenant admin can pay, change their card or bank account, and cancel at period end. They cannot set their own price.

## 10. What the tenant does

1. Use the product while the switch is off. No pay page is required.
2. When the admin turns the switch on, open the billing page from the admin home.
3. Read the plan (or the custom amount) and choose monthly, yearly, or one-time if more than one option is offered.
4. For gas stations on location pricing, check which locations are included. The page shows the monthly total before they continue.
5. Continue to Stripe Checkout. Pay by card or, in the US, by bank account.
6. Return to the billing page. It should say Active.
7. Later, use “Manage billing” to update the card or bank account, download invoices, or cancel.

## 11. What must not change

- Ticket Checkout, the mobile wallet button, ticket success pages, and ticket webhooks.
- Membership subscribe, membership success, membership QR, and membership renewal jobs.
- The rule that ticket and membership webhooks ignore events whose metadata says `billingScope=platform_tenant`.
- Clerk sign-in and the satellite-domain setup.
- Public event pages. A locked tenant loses paid **admin** tools. We do not take the public website down in the first build unless a later phase says so.

## 12. Where the facts live

When this is built, store platform billing on its own records, not on membership subscription rows.

On each tenant organization, keep the Stripe customer id that already exists (`stripeCustomerId`). One customer covers both products.

For each product (event site, gas station), store at least:

- Charge switch on or off.
- Status (complimentary, payment due, active, past due, locked).
- Catalog plan id, if they are on a catalog plan.
- Custom fee amount, if set. Empty means “use the catalog price.”
- Billing mode actually chosen: recurring or one-time.
- Review-by date (reminder only).
- Grace end date (set when the switch turns on).
- Stripe subscription id, for recurring only.
- Stripe payment id, for one-time.
- Paid-through date, for one-time.
- For gas stations: which locations are included. The billable count is calculated, not typed.

Webhook handling for these payments must set metadata `billingScope=platform_tenant` on the Checkout session so ticket and membership code can skip the event.

## 13. Related documents

- [README.md](README.md) — index and the Stripe decision in one page.
- [STRIPE_VS_ZOHO_ANALYSIS.md](STRIPE_VS_ZOHO_ANALYSIS.md) — Stripe, Zoho, and merchant-of-record options.
- [BUILD_PLAN.md](BUILD_PLAN.md) — phases to implement this guide.
- [PLATFORM_TENANT_BILLING_GUIDE.html](PLATFORM_TENANT_BILLING_GUIDE.html) — this guide as a styled page.
- Tenant management PRD: [../PRD.md](../PRD.md) — the older subscription labels (FREE, BASIC, PREMIUM, ENTERPRISE). This guide replaces that billing section for implementation.
- Existing ticket and membership payment docs live under `documentation/domain_agnostic_payment/`. Read them to avoid copying the wrong flow.
