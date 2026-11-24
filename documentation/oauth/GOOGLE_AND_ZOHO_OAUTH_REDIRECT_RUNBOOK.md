# Google and Zoho OAuth Redirect Runbook

Step-by-step guide for updating the OAuth redirect URIs used by the AdwiiseAgent platform. Use it after a domain change, when adding a Clerk domain, or when Google or Zoho sign-in fails with `redirect_uri_mismatch`.

Current primary domain: **www.adwiiseagent.ai** (Clerk frontend API `https://clerk.adwiiseagent.ai`). `kluvo.io` and `event-site-manager.com` 301-redirect to it.

---

## 1. Google sign-in (Clerk social connection)

Google sign-in on every site (hub and satellites) goes through Clerk. Google sends the user back to **Clerk's** callback, not to the app, so only the Clerk frontend API host needs to be registered.

### Where it lives

| Item | Value |
|---|---|
| Console | [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) |
| Project | **OauthLocal** (project id `oauthlocal-310103`), selected in the top project picker |
| OAuth client | **kccna_app** under **OAuth 2.0 Client IDs** (Web application, created Oct 17, 2021) |
| Client ID | `303554160954-0nkuttb13bjlfkpsu02sbm5dr3r5bp1m.apps.googleusercontent.com` |
| Not used | `Web client 1` in the same project |
| Consumer | Clerk Dashboard → production instance → Configure → SSO connections → Google (custom credentials) |

### Steps

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select **OauthLocal** in the project picker at the top.
2. On the left, open **Credentials** under **APIs & Services**.
3. Under **OAuth 2.0 Client IDs**, click **kccna_app**. Do not open **Web client 1**.
4. **Authorized redirect URIs** already contain these values. Do not add them again. A new satellite does not need a new URI, so leave the list unchanged:
   ```
   https://clerk.adwiiseagent.ai/v1/oauth_callback
   https://humble-monkey-3.clerk.accounts.dev/v1/oauth_callback
   ```
5. Leave **Authorized JavaScript origins** as they are. Do not add the satellite hostname.
6. Do not click **Save** unless some other value on the client was changed.

### Current redirect URIs (Oct 13, 2026)

| # | URI | Status |
|---|---|---|
| 1 | `https://clerk.adwiise.com/v1/oauth_callback` | Legacy |
| 2 | `https://humble-monkey-3.clerk.accounts.dev/v1/oauth_callback` | Clerk development instance |
| 3 | `https://feature-common-clerk.d1508w3f27cyps.amplifyapp.com/sso-callback` | Legacy |
| 4 | `https://www.mosc-temp.com/sso-callback` | Legacy |
| 5 | `https://clerk.event-site-manager.com/v1/oauth_callback` | Previous primary; remove once adwiiseagent.ai sign-in is confirmed |
| 6 | `https://clerk.adwiiseagent.ai/v1/oauth_callback` | **Current production** |

### Notes

- These two redirect URIs are already on **kccna_app**. Do not add them again: `https://clerk.adwiiseagent.ai/v1/oauth_callback` and `https://humble-monkey-3.clerk.accounts.dev/v1/oauth_callback`.
- Satellites (mosc-temp, giventa, kcnj, bst-school-demo, and others) do **not** need their own redirect URIs. Sign-in happens on the primary domain, and Clerk hands the session back to the satellite.
- Authorized JavaScript origins are not required for the Clerk-hosted flow; leave the existing entries alone.
- If Clerk's production domain changes again, the new value is always `https://clerk.<primary-bare-domain>/v1/oauth_callback`. Confirm it under Clerk Dashboard → Domains → Frontend API.
- The client secret is stored only in the Clerk Dashboard Google connection. If you rotate it in Google Cloud, paste the new secret into Clerk the same day.

---

## 2. Zoho SalesIQ OAuth (server-based app)

Used to obtain a `ZOHO_REFRESH_TOKEN` for SalesIQ automation (for example, bulk article scripts). It is an admin-only, run-once flow, not end-user sign-in.

### Where it lives

| Item | Value |
|---|---|
| Console | [Zoho API Console](https://api-console.zoho.com/) (US data center; `ZOHO_ACCOUNTS_BASE_URL` is unset, so the code uses `https://accounts.zoho.com`) |
| Client type | Server-based Application |
| Client ID | Starts with `1000.EYHWE46…` (stored as `ZOHO_CLIENT_ID`) |
| Routes (hub repo only) | `src/app/oauth/zoho/start/route.ts`, `src/app/oauth/zoho/callback/route.ts` |
| Redirect logic | `src/lib/zoho/salesiq-oauth.ts` → `getZohoOAuthRedirectUri()` |

### Steps

1. Sign in to [https://api-console.zoho.com/](https://api-console.zoho.com/) with the Zoho account that owns the SalesIQ portal (`giventainc`).
2. Open the **Server-based Application** whose Client ID starts with `1000.EYHWE46`.
3. In **Client Details → Authorized Redirect URIs**, add:
   ```
   https://www.adwiiseagent.ai/oauth/zoho/callback
   ```
   Keep `http://localhost:3000/oauth/zoho/callback` for local runs. Remove `https://www.event-site-manager.com/oauth/zoho/callback` after the new one works.
4. Click **Update**.
5. Confirm `ZOHO_OAUTH_REDIRECT_URI=https://www.adwiiseagent.ai/oauth/zoho/callback` in Amplify (set on the hub, test-site, giventa, kcnj-temp, mcefee-temp, keralacenter).

Verified Oct 13, 2026: the console app is **Giventa SalesIQ Automation** (Client ID `1000.EYHWE466VPE6MZIK45YCCLBFTL77TD`, owner Gain Joseph). Its redirect URIs are `http://localhost:3000/oauth/zoho/callback` and `https://www.adwiiseagent.ai/oauth/zoho/callback`, and Zoho redirects to the adwiiseagent.ai callback after consent.

### Running the flow

The `/oauth/zoho/*` routes exist only in the **hub** (`event-site-manager`). Since Oct 13, 2026 the hub Amplify app (`d3gov7yn1ctow1`) has `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_OAUTH_REDIRECT_URI` and `ZOHO_SALESIQ_SCREEN_NAME` (copied from the satellite apps). `next.config.mjs` inlines them at build time, so redeploy the hub after changing any of them.

- **Production:** open `https://www.adwiiseagent.ai/oauth/zoho/start`, sign in to the `giventainc` Zoho account, approve, and copy the refresh token from the success page.
- **Local:** put `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` in `event-site-manager/.env.local`, run `npm run dev`, and open `http://localhost:3000/oauth/zoho/start`. Local runs always use the localhost callback regardless of `ZOHO_OAUTH_REDIRECT_URI`.

Store a new refresh token as `ZOHO_REFRESH_TOKEN` in `.env.local` and on the Amplify apps that use it. Never commit it.

Zoho requires an exact match between the `redirect_uri` sent by the app and a registered URI, including scheme, host and path.

---

## 3. Checklist after a primary domain change

- [ ] Google: add `https://clerk.<new-domain>/v1/oauth_callback` to **kccna_app** (project OauthLocal).
- [ ] Zoho: add `https://www.<new-domain>/oauth/zoho/callback` to the server-based app.
- [ ] Amplify: update `ZOHO_OAUTH_REDIRECT_URI` on every app that has it.
- [ ] Test Google sign-in on the primary domain and one satellite.
- [ ] After a week of normal use, remove the old domain's redirect URIs from Google and Zoho.

## Related

- [Clerk v7 migration and auth fix](../clerk_authentication_v7_upgrade/CLERK_V7_MIGRATION_AND_AUTH_FIX.html), section 7 (Google Cloud Console configuration)
- `.cursor/rules/clerk_auth_satellite_v7_handshake.mdc`
