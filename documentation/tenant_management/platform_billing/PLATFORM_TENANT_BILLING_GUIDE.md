# Tenant platform billing guide

This guide explains, in plain English, how an organization pays for an event-style website or a retail website. It is the reference for the build described in [BUILD_PLAN.md](BUILD_PLAN.md). The payment-system choice is explained in [STRIPE_VS_ZOHO_ANALYSIS.md](STRIPE_VS_ZOHO_ANALYSIS.md).

Charging is live. A platform super-admin turns the charge switch on at `/admin/platform-billing/{tenantId}`, and the paying admin opens Pay on `/admin/billing`. Stripe Checkout collects the card. The charge ledger is `/admin/platform-billing`.

`{tenantId}` is that website’s tenant id. From `/admin/platform-billing`, open the organization, then open the tenant id. Use the **Charge switch** under Event site or Retail and confirm. The catalog plan, custom fee, review-by date, and grace days are saved with **Save event site billing** or **Save retail billing**. Which database tables hold those fields, and what changes the status to Locked, is in [Where the facts live](#12-where-the-facts-live). That save does not charge the card. Payment due starts only when the charge switch is turned on. The review-by date is only a reminder for the admin. Grace days are how many days the website can still be used after the switch is turned on, before payment is required. Grace days start at 14 unless you type a different number. During those days the status is Payment due and the admin tools still work. If nobody pays before the days end, the status becomes Locked only when an admin later opens the billing page, or when Stripe tells this app that a subscription was deleted because payment failed. Paid admin tools are then blocked, and the public website stays online. Only a platform super-admin can open `/admin/platform-billing/{tenantId}`. A regular tenant admin on `/admin/billing` sees Pay and cannot turn the switch on. A platform super-admin who is signed into that same tenant also sees the switch on `/admin/billing`.

## 1. Two different kinds of money

This platform already takes two kinds of payments. This guide adds a third. Keep them separate.

**Ticket money.** A guest buys a ticket for an event. The existing desktop Checkout and mobile Apple Pay / Google Pay flows handle that. Those flows save a ticket transaction and show a success page. Do not change them to bill the tenant.

**Membership money.** A person joins a membership that renews. The existing membership subscription flows save a Stripe subscription id for that person. Do not use those tables, those success pages, or the Payment Request Button for tenant fees.

**Platform money (this guide).** The organization that runs the website pays for the software. A school or a church pays the event-site fee. A shop pays the retail fee. One Stripe customer per organization. The event-site fee and the retail fee stay separate, so a hybrid organization can be free on one and paying on the other.

The words “subscription” and “plan” appear in three different forms. They do not share a list.

| Words you see | Where they are defined | Where the dropdown appears | What it bills |
| --- | --- | --- | --- |
| Basic, Professional, Enterprise | `/admin/access-catalogs/subscription-plans`. **Add plan** sets Code and Label. Basic, Professional, and Enterprise are shared rows already in that list. The organization stores the code, such as `BASIC`. | **Subscription Plan** on `/admin/onboarding-requests/new`, and **Plan** on `/admin/tenant-management/settings/{id}/edit`. | Nothing. It is a label on the organization. It does not create a Stripe price and it does not charge the card. |
| Starter, Standard, Custom | `/admin/platform-billing/plans`. These names are not a built-in list. **Add plan** has a **Name** box and a **List price (USD)** box. Type Starter and 49.00, or Standard and 149.00, or Custom and 0.00, then check **Published**. | **Catalog plan** on `/admin/platform-billing/{tenantId}`, after the plan exists. Save with **Save event site billing** or **Save retail billing**. | The software fee for that website, after the charge switch is on and someone pays. |
| Membership plan names | `/admin/membership/plans`. | The public membership pages a person uses to join. | That person’s membership. Leave those plans out of platform billing. |

## 2. What the tenant is buying

A tenant can be on one or both products:

- **Event site.** One fee for a website that is not a shop. The site type can be Events organization, Church / parish, School, Sports team, Music band, Personal profile, or Hybrid. The billing page has only two charge switches, Event site and Retail. A school or a church is not a third switch. Open the Event site card, turn that switch on, and click **Save event site billing**.
- **Retail.** One fee for a shop website. The site type is Retail. The retail type, also called the shop pack, is Gas station, Liquor store, Dunkin Donuts, Seven-Eleven, Restaurant, or Clinic. The Retail card shows that pack. The fee can grow with the number of included locations. One subscription covers the chain, not one per store. They use **Save retail billing**.

For each product the tenant can be offered:

- A **catalog plan** with a published price (for example Starter, Standard, or a retail location rate for a gas-station retail type).
- A **custom fee** typed by a platform admin for that tenant only. The catalog price is ignored for that tenant when a custom fee is set.
- **Recurring** or **one-time** billing, from the **Billing** dropdown on `/admin/platform-billing/plans` (section 4). A plan created there is monthly.
- A **long free period**. The tenant uses the product with no card on file until a person turns charging on. A reminder date does not start a charge by itself.

Organization billing is different. If a super admin chooses **Bill the organization once** and types one monthly amount, that one payment covers every website under the organization. Four websites or ten websites still mean one charge, not four or ten charges. Each website’s own Event site and Retail switches are turned off. Those websites stay complimentary and do not show their own Pay button. A website added later is covered by the same amount. The card charged is the organization’s Stripe customer. Choosing **Bill each website separately** again does not start a charge by itself. Each website stays free until its own switch is turned on.

## 3. The charge switch

This is the main rule.

1. When a tenant is created, the charge switch for each product is **off**.
2. While the switch is off, the tenant uses that product freely. No Stripe customer is required. No invoice is created. No card is stored.
3. Only a **platform super-admin** can turn the switch on. Open `/admin/platform-billing`, open the organization, then open `/admin/platform-billing/{tenantId}`. Use the **Charge switch** and confirm. The switch saves on its own. The tenant cannot turn it on, and a reminder date cannot turn it on.
4. The review-by date is only a reminder for the admin. It does not start a charge.
5. Grace days start at 14 unless you type a different number. During those days the charge switch is on, the status is Payment due, and the admin tools still work. If nobody pays before the days end, the status becomes Locked. A tenant admin who opens another admin page is sent to `/admin/billing`. Visitors can still open the public website.
6. If grace ends and there is still no successful payment, the paid admin tools for that product stop. The tenant’s public site and stored data stay in place. A pay page explains what to do.
7. Turning the switch **off** again stops future charges. It does not delete the tenant. If a Stripe subscription is already running, turning the switch off cancels that subscription at the end of the period already paid (or immediately, if the admin chooses “stop now” and confirms).

The status pill is on the Event site card and the Retail card at `/admin/billing` and at `/admin/platform-billing/{tenantId}`. A **Status** field sits with Catalog plan, Custom fee, Review-by date, and Grace days, and it repeats the same words. The screen shows Complimentary or Payment due. The same status is in the Status column on `/admin/platform-billing` and on the organization billing page.

- **Complimentary** — the charge switch is off. The website uses the product for free. No card is charged. The pill says `COMPLIMENTARY`.
- **Payment due** — the charge switch is on, the grace days have not ended, and nobody has paid yet. Admin tools still work. The pill says `PAYMENT_DUE`.
- **Active** — switch on and paid (recurring subscription in good standing, or one-time payment still inside its paid-through date).
- **Past due** — a renewal failed and Stripe is still retrying.
- **Locked** — the grace days ended and the fee is still unpaid. Paid admin tools are blocked. The public website stays online. The pill says `LOCKED`.

## 4. Plans the tenant can choose

A platform super-admin sets the catalog at `/admin/platform-billing/plans` (Platform billing plans). **Add plan** creates a plan. The pencil on a listed plan edits it. Unpublished plans stay hidden from tenants. The tenant sees only published plans for products they actually have.

| What | Page and field |
| --- | --- |
| Product, name, and code | **Product**, **Name**, and **Code** on Add plan or Edit plan. Product is Event site or Retail. An optional shop pack limits a retail price to one retail type, such as Gas station. Older saved gas-station plans stay visible until you edit them. Type the name yourself. Starter and Standard are not a built-in dropdown the way Basic and Professional are. |
| Recurring, one-time, or both | The **Billing** dropdown on Add plan or Edit plan. Recurring only means Stripe charges again on the schedule, usually every month. One-time only means Stripe charges once and does not charge again. Recurring or one-time means either way is allowed. The pay page uses **Pay monthly** for a repeating charge and **Pay once** for a single charge. |
| Interval | A plan saved from that dialog is every month. The dialog has no month-or-year field. A yearly amount is a second published plan on the same product, with its own name and list price. This screen does not store a year interval. |
| List price | **List price (USD)** on that dialog. Type the real amount with cents, for example 49.00 or 149.00. A Custom plan with no list price uses 0.00 here. The amount that website pays is then **Custom fee USD** on `/admin/platform-billing/{tenantId}`. |
| Stripe price id | Optional. Leave **Stripe price id** blank when you create or update a plan. Typing the list price does not create a Stripe price and does not fill that box. Pasting a price id does not change the list price. If the box is empty, the first payment creates a Stripe price from the list price, or from the custom fee. Paste a price id only when that price already exists in Stripe and Checkout should use it. |
| Feature list and published flag | **Feature summary** and the **Published** checkbox on the same dialog. |
| Which plan one website uses | **Catalog plan** on `/admin/platform-billing/{tenantId}`, then **Save event site billing** or **Save retail billing**. That page picks a plan that already exists. It does not create the price. |

Placeholder prices, not a quote. The numbers in this guide are examples until someone types them on `/admin/platform-billing/plans`. Event site Starter is $49.00 per month, Standard is $149.00 per month, and Custom uses list price $0.00. The location rates in section 6 are the same kind of example, often used for a gas-station retail type. A custom flat amount for one website is **Custom fee USD** on `/admin/platform-billing/{tenantId}`, not a field on the plans page. Set the real numbers before the first live charge.

## 5. A custom fee for one tenant

Some tenants will not pay the catalog price. A platform super-admin sets a custom amount on that tenant’s product:

- Custom monthly amount, or custom one-time amount, in US dollars, with cents (always stored and shown with two decimal places, such as 199.00).
- Optional note (“agreed March 2026, includes 12 locations”).
- The catalog plan name can still be shown so support knows which feature set they bought. The **amount charged** is the custom amount.

When the tenant pays, Stripe gets a price that exists only for that tenant. Other tenants keep the shared catalog price.

If the admin later changes the custom amount:

- Recurring: the next invoice uses the new amount. The current period is not re-billed unless the admin also chooses “apply now,” which prorates.
- One-time already paid: the change does not create a second charge. It applies only if the admin sends a new one-time pay link.

## 6. Retail shops and location count

The count is the number of included retail locations. It is not a gas-station-only bill. A gas-station retail type can still use location tiers. Fuel rules stay in the retail module, not in this fee.

- One subscription for the tenant, not one subscription per store.
- The tenant (or the admin) marks which locations are included.
- The billable count is the number of locations that are active and included.
- The rates are stepped. The first locations stay at the higher price. Each location you add after that is cheaper, but it is added on top. The earlier locations are not repriced. Going from 3 locations to 4 is the first three at $199 plus one more at $149, not four locations at $149. Adding a location always makes the bill larger. These rates are often used for a gas-station retail type:
  - 1 to 3 locations: $199 each per month.
  - 4 to 10 locations: $149 each per month for those extra locations.
  - 11 or more: $99 each per month for those extra locations.
- Example: 6 locations = (3 × $199) + (3 × $149) = $1,044 per month.
- These dollar amounts are examples in this guide. They are not a settings screen. Put the real list price in **List price (USD)** on `/admin/platform-billing/plans`, on a Retail plan. A flat amount for one website is **Custom fee USD** on `/admin/platform-billing/{tenantId}`, and that custom fee replaces the location math. The Add plan dialog has no fields for the 1 to 3, 4 to 10, and 11 or more tiers.
- A custom flat fee replaces this math for that tenant. Quantity is then ignored.
- Adding or removing an included location after they are subscribed changes the next invoice and prorates the current period.

The older note in the mosc-temp repo (`documentation/tenant_management/gas_station_site/gas_station_subscription_billing.md`) describes the same location idea. This folder is the one to follow, because it also covers event sites, the charge switch, and custom fees.

## 7. Recurring payment or one-time payment

The **Billing** dropdown on Add plan or Edit plan records how that plan may be charged. Recurring only means Stripe charges again on the schedule. One-time only means Stripe charges once. Recurring or one-time means either way is allowed. You do not need a Stripe price id to create or update the plan. Leave it blank and type the list price. The first payment creates the Stripe price. Paste a price id only when you already made that price in Stripe.

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
2. Set the catalog on `/admin/platform-billing/plans` before the first live charge. **List price (USD)**, **Billing**, and **Published** are on Add plan. A new plan is monthly.
3. If this tenant negotiated a price, open `/admin/platform-billing/{tenantId}` and type the custom fee and a short note. Leave the switch off.
4. Optionally set a review-by date. It is only a reminder. It does not charge the card.
5. When the business is ready to charge, open `/admin/platform-billing/{tenantId}` and turn the switch on for the event site, retail, or both. Set the grace days (default 14) and save. Saving does not charge the card. Payment due starts when the switch is turned on.
6. Tell the tenant to open `/admin/billing` and pay. The page shows the catalog, or only the custom amount if one is set.
7. After they pay, confirm the status is Active and that the Stripe customer id and subscription id (or one-time payment id) are stored.
8. If a renewal fails, Stripe emails the tenant and retries. The admin list shows Past due. Do not build a second retry system.
9. To stop charging without deleting the tenant, turn the switch off and confirm whether the current period should finish or stop now.

Only a platform super-admin can change the switch, the custom fee, the catalog, or the grace days. A tenant admin can pay, change their card or bank account, and cancel at period end. They cannot set their own price.

## 10. What the tenant does

1. Use the product while the switch is off. No pay page is required.
2. When the admin turns the switch on, open `/admin/billing` and click Pay. That page does not let a tenant admin turn the switch on.
3. Read the plan (or the custom amount) and choose monthly, yearly, or one-time if more than one option is offered.
4. For a retail website on location pricing, check which retail locations are included. The page shows the monthly total before they continue.
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

For each product (event site or retail), store at least:

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
- For retail: which locations are included. The billable count is calculated, not typed.

Webhook handling for these payments must set metadata `billingScope=platform_tenant` on the Checkout session so ticket and membership code can skip the event.

**Save event site billing** and **Save retail billing** write one row in `tenant_product_billing` for that website and product. The catalog plan is `platform_plan_id`, which points at `platform_billing_plan`. The custom fee is `custom_fee_usd`. The review-by date is `review_by_date`. Grace days are `grace_days`, and the moment grace ends is `grace_ends_at`. The status word is `status`.

A person who saves the plan, the fee, the switch, or the grace days is recorded in `platform_billing_assignment_event`, with their user id and a short reason. Payments are a separate list in `platform_billing_charge`.

Nothing runs at midnight to change the status. There is no batch job for this. Opening the page does change the status when grace is over. It is not only a look. A platform super-admin can open `/admin/billing` or `/admin/platform-billing/{tenantId}`. A tenant admin can open `/admin/billing`. If the charge switch is still on, the status is still Payment due or Past due, `grace_ends_at` is in the past, and no paid charge covers today, that page writes Locked. If grace has not ended, the page only reads the row and leaves the status as it is. No person is stored as the one who locked it.

The Stripe Customer Portal does not update our database. Stripe sends a message to this Next.js app, not to the Spring backend. The receiver is `src/app/api/webhooks/stripe/route.ts`, which is the address `/api/webhooks/stripe`. Platform billing, including Locked when a subscription is deleted because payment failed, is handled in this project by `src/lib/platformBilling/applyPlatformBillingWebhook.ts`. That code then calls the backend billing API. Stripe does not call the Spring app directly for this. Ticket and membership events that are not platform billing are forwarded from the same file to `{NEXT_PUBLIC_API_BASE_URL}/api/webhooks/stripe`.

Stripe is told where to send events outside this repo. In the Stripe Dashboard, the endpoint URL is this site’s `/api/webhooks/stripe`. On a local machine, `stripe listen --forward-to http://localhost:3001/api/webhooks/stripe` does the same job. This app checks the signature with the environment variable `STRIPE_WEBHOOK_SECRET`, read in `src/lib/stripe/init.ts`. Set that in `.env.local` for local work and in Amplify for production. It is the signing secret Stripe shows when the endpoint is created. It is not a URL. If Stripe deletes the subscription because the payment failed, our app sets Locked. A failed payment that does not delete the subscription sets Past due, not Locked.

## 13. Related documents

- [README.md](README.md) — index and the Stripe decision in one page.
- [STRIPE_VS_ZOHO_ANALYSIS.md](STRIPE_VS_ZOHO_ANALYSIS.md) — Stripe, Zoho, and merchant-of-record options.
- [BUILD_PLAN.md](BUILD_PLAN.md) — phases to implement this guide.
- [PLATFORM_TENANT_BILLING_GUIDE.html](PLATFORM_TENANT_BILLING_GUIDE.html) — this guide as a styled page.
- Tenant management PRD: [../PRD.md](../PRD.md) — the older subscription labels (FREE, BASIC, PREMIUM, ENTERPRISE). This guide replaces that billing section for implementation.
- Existing ticket and membership payment docs live under `documentation/domain_agnostic_payment/`. Read them to avoid copying the wrong flow.
