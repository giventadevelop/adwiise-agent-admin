# Admin Help Chat — Amplify Bedrock IAM

Admin Help Chat calls Amazon Bedrock from the Next.js server route `POST /api/admin/help-chat` (same account and model family as the retail AI engine). The browser never receives AWS credentials.

**Full integration guide (keep mirrored):** [bedrock_llm_admin_help_and_chat_integration.html](./bedrock_llm_admin_help_and_chat_integration.html) and Cursor rule `.cursor/rules/bedrock_llm_admin_help_and_chat_integration.mdc` (also under `application-deployments`).

## Environment variables

Set on Amplify (and locally in `.env.local` when testing Bedrock):

| Variable | Purpose | Example |
|----------|---------|---------|
| `BEDROCK_ENABLED` | Admin Help defaults to **on**. Set `false` to force knowledge-pack stubs only | `true` |
| `BEDROCK_REGION` | Bedrock region | `us-east-1` |
| `BEDROCK_MODEL_ID` | Same as retail engine | `us.anthropic.claude-sonnet-5-5` |

Optional aliases: `ADMIN_HELP_BEDROCK_ENABLED`, `ADMIN_HELP_BEDROCK_REGION`, `ADMIN_HELP_BEDROCK_MODEL_ID` (used if the primary names are unset).

### Amplify inventory (account `224674645062`)

Amplify Hosting apps are in **`us-east-2`** (not `us-east-1`). Bedrock Runtime stays **`us-east-1`**.

| App | App ID | Branch | Role |
|-----|--------|--------|------|
| Prod hub `event-site-manager` (`www.adwiiseagent.ai`) | `d3gov7yn1ctow1` | `release/v1.0.0` | `AmplifySSRLoggingRole-1cc46167-...` |
| Dev hub `adwiise-agent-dev-hub` | `d3qk5eouzr7b80` | `release/v1.0.0` | same hub role |
| Dev satellite `adwiise-agent-dev-satellite` | `d3umj04vhrd3rv` | `release/v1.0.0` | same hub role |

### Push env vars to Amplify (merge, does not wipe other keys)

```powershell
cd F:\project_workspace\adwiise-agent-admin
# Prod hub (defaults)
.\scripts\set-amplify-bedrock-env.ps1
# Dev hub
.\scripts\set-amplify-bedrock-env.ps1 -AppId d3qk5eouzr7b80
# Optional redeploy after merge:
.\scripts\set-amplify-bedrock-env.ps1 -StartRelease
```

**Safety:** the merge script refuses to update if `get-app` JSON parse fails or the app has fewer than 10 env keys (prevents wiping a full env down to only Bedrock keys).

Local env files (`.env`, `.env.local`, `.env.production`) should also contain the same three Bedrock keys. `amplify.yml` must include `BEDROCK_` in the build-time env grep so SSR Lambdas see them.

## Amplify compute role (required)

The service role's Bedrock policy does nothing for Admin Help until the app **compute role** is that same role. `computeRoleArn: null` means the Next.js server has no Bedrock credentials, `invokeAdminHelpBedrock` throws, and the route returns the short knowledge-pack stub (`backend: "stub"`). Local works because the developer credential chain can call Bedrock. `BEDROCK_ENABLED=true` only means the route will try the call.

Follow the same ordered steps in [bedrock_llm_admin_help_and_chat_integration.html](./bedrock_llm_admin_help_and_chat_integration.html) section “Short stub on the hubs, long answer locally” and in `.cursor/rules/bedrock_llm_admin_help_and_chat_integration.mdc`.

1. `aws amplify get-app --app-id <id> --region us-east-2 --query app.computeRoleArn` (add `--no-verify-ssl` on `CERTIFICATE_VERIFY_FAILED`).
2. Attach `bedrock-invoke-policy.json` as inline policy `AdminHelpBedrockInvoke`. The `us.` profile needs foundation-model and inference-profile invoke in `us-east-1`, `us-east-2`, and `us-west-2`.
3. `aws amplify update-app --app-id <id> --compute-role-arn <role-arn> --region us-east-2` for `d3gov7yn1ctow1` and `d3qk5eouzr7b80`. Do not pass `--environment-variables` unless the payload is the full map. Confirm the env key count did not drop.
4. `aws amplify start-job --app-id <id> --branch-name release/v1.0.0 --job-type RELEASE --region us-east-2`. A compute-role change is not live until this release.
5. Sign in and confirm `POST /api/admin/help-chat` returns `"backend":"bedrock"`. `"backend":"stub"` means invoke still failed; read `/aws/amplify/<appId>` for `[adminHelp] Bedrock invoke failed`.

Role ARN: `arn:aws:iam::224674645062:role/service-role/AmplifySSRLoggingRole-1cc46167-ac65-414a-b580-7103432bd70a`. Applied 2026-11-06 on prod release 152 and dev release 15.

## Attach the invoke policy

> Note: List Amplify apps with `aws amplify list-apps --region us-east-2`. An earlier “zero apps / app not found” failure was from querying **`us-east-1`** with a stale app id (`d1508w3f27cyps`). The live hub is `d3gov7yn1ctow1` in **us-east-2**.

1. Open **IAM** → roles used by Amplify Hosting compute / SSR for this app (account `224674645062`).
2. Attach the policy from [bedrock-invoke-policy.json](./bedrock-invoke-policy.json), or run:

```powershell
.\scripts\attach-amplify-bedrock-iam.ps1 -RoleName <AmplifyServiceOrComputeRoleName>
```

3. Policy shape (also in the JSON file):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AdminHelpBedrockInvoke",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/*",
        "arn:aws:bedrock:us-east-2::foundation-model/*",
        "arn:aws:bedrock:us-west-2::foundation-model/*",
        "arn:aws:bedrock:us-east-1:224674645062:inference-profile/*",
        "arn:aws:bedrock:us-east-2:224674645062:inference-profile/*",
        "arn:aws:bedrock:us-west-2:224674645062:inference-profile/*"
      ]
    }
  ]
}
```

4. Confirm the model / inference profile is enabled in Bedrock **Model access** for that region.
5. Redeploy Amplify after env + IAM changes.
6. Smoke-test: sign in as ADMIN → open any `/admin` page → Help → ask “How do I upload media for an event?”. Response `backend` in network JSON should be `bedrock` when enabled.

Locally, use the default AWS credential chain (SSO profile, env keys, or instance role) with the same permissions.

## Fallback: Java proxy (only if Amplify cannot hold Bedrock IAM)

Retail Ask already forwards through the Spring API because Amplify cannot reach the internal engine ALB. If Amplify SSR cannot invoke Bedrock:

1. Add a thin authenticated Spring endpoint (for example `POST /api/admin-help/chat`) that accepts `{ question, pathname, knowledge context }` or builds context server-side and calls Bedrock with the service role.
2. Point the Next.js route at that backend URL via `fetchWithJwtRetry` instead of `@aws-sdk/client-bedrock-runtime`.
3. Do **not** reuse `/api/retail-brief/chat` or the AI engine `POST /v1/chat` — those are brief-grounded retail Ask only.

Prefer Amplify → Bedrock direct. Use the Java proxy only when IAM on Amplify is blocked by org policy.

## Security notes

- Route requires a Clerk session and `ADMIN` / `SUPER_ADMIN` access (`getCurrentAdminAccess`).
- Platform-only knowledge is omitted for non–SUPER_ADMIN callers.
- Help answers are read-only explanations; the bot does not mutate admin data.
