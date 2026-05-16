# Zest Studio

Zest Studio is a Lemonade-style Roblox builder split into three connected layers:

1. A public-facing React app with a homepage and a richer studio dashboard.
2. Supabase tables plus Edge Functions that store project memory and turn prompts into structured Roblox operations.
3. A Roblox Studio plugin that claims queued jobs, applies safe edits, and reports the result back.

## What is in this version

- A simpler Lemonade-style homepage plus a cleaner plugin-first studio dashboard.
- Homepage gating that waits for Roblox Studio to authorize the signed-in Studio account before opening the builder.
- Short-code Studio pairing instead of a giant manual payload for the normal flow.
- A zero-key built-in starter planner plus free-first Groq and optional OpenAI, Anthropic, Gemini, and Kimi.
- Inventory-like code packs that add reusable system context to prompts.
- The real planner -> queued job -> Studio plugin -> result loop.
- Existing Auth and Stripe scaffolding still in the repo for later, but no longer required for the core path.

## Folder map

- `src/` - Vite + React frontend.
- `supabase/schema.sql` - database schema plus RPC helpers.
- `supabase/functions/` - guest-ready core functions, auth/billing functions, Stripe endpoints, and plugin-sync.
- `plugin/robolua-plugin.lua` - Roblox Studio plugin source.

## Setup

### 1. Create the Supabase project

1. Open the Supabase dashboard.
2. Create a new project.
3. Open the SQL editor.
4. Run the SQL from [supabase/schema.sql](./supabase/schema.sql).
5. In **Authentication > URL Configuration**, set your site URL for the frontend you will deploy.

### Optional later: Roblox login via OIDC

To match the easier Lemonade-style login flow, add Roblox as a custom OIDC provider in Supabase Auth:

1. In the Roblox Creator Dashboard, create an OAuth 2.0 app.
2. In Supabase, go to **Authentication > Providers > New Provider**.
3. Choose **Auto-discovery (OIDC)**.
4. Use the identifier `custom:roblox`.
5. Set the issuer to `https://apis.roblox.com/oauth/`.
6. Copy the callback URL shown by Supabase and paste it into your Roblox OAuth app.
7. Use scopes `openid profile`.
8. If you want Roblox login to work even when the account does not share an email, enable Supabase's email-optional setting for the provider.

This repo still includes the Roblox OAuth setup helper for when you want account verification later:

```bash
set SUPABASE_URL=https://atycbrnthkgbrsxyabbs.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
set ROBLOX_CLIENT_ID=your-roblox-client-id
set ROBLOX_CLIENT_SECRET=your-roblox-client-secret
npm run setup:roblox-provider
```

### 2. Add the planner secrets

For the new free-start path, the absolute minimum is now no external AI secret at all, because `Zest Starter` is built in.

If you want a stronger free external model after that, the smallest useful upgrade is:

- `GROQ_API_KEY`
- `GROQ_BASE_URL`

Optional:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `MOONSHOT_API_KEY`
- `MOONSHOT_BASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_STUDIO_MONTHLY`
- `STRIPE_PRICE_PACK_BOOST_25`
- `STRIPE_PRICE_PACK_BUILDER_120`
- `STRIPE_PRICE_PACK_STUDIO_500`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `STRIPE_PORTAL_RETURN_URL`

`OPENAI_MODEL` is still supported as a fallback, but the current dashboard defaults to the built-in starter first and then Groq as the best free external upgrade.

Example local secret file:

```bash
GROQ_API_KEY=your-groq-key
GROQ_BASE_URL=https://api.groq.com/openai/v1
```

Then push it:

```bash
npx supabase secrets set --env-file .env.supabase
```

### 3. Link and deploy the functions

From this folder:

```bash
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase config push --yes
npx supabase functions deploy provider-status --no-verify-jwt
npx supabase functions deploy workspace-state --no-verify-jwt
npx supabase functions deploy generate-job --no-verify-jwt
npx supabase functions deploy plugin-sync --no-verify-jwt
```

`supabase/config.toml` now splits the surface correctly:

- Core guest workspace functions can run from the workspace token so the free-start flow works without email auth.
- `plugin-sync` stays public and uses the workspace token.

If you want the full account + billing layer later, also deploy:

```bash
npx supabase functions deploy project-hub
npx supabase functions deploy billing-control
npx supabase functions deploy create-checkout
npx supabase functions deploy customer-portal
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

### 4. Start the frontend

Copy `.env.example` to `.env`, fill the two `VITE_` values, then run:

```bash
npm install
npm run dev
```

You will use:

- `VITE_SUPABASE_URL` - your project URL.
- `VITE_SUPABASE_ANON_KEY` - your public or legacy anon key.

### 5. Optional Stripe webhook

In Stripe, create a webhook endpoint that targets:

`https://your-project-ref.supabase.co/functions/v1/stripe-webhook`

Subscribe it to at least:

- `checkout.session.completed`
- `checkout.session.expired`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### 6. Install the Roblox Studio plugin

1. Open Roblox Studio.
2. Enable **Game Settings > Security > Allow HTTP Requests**.
3. Open the local Plugins folder from Studio.
4. Download the plugin from the Zest dashboard or copy [plugin/robolua-plugin.lua](./plugin/robolua-plugin.lua) into that folder.
5. Restart Studio.
6. Open the **Zest Studio** toolbar button.
7. From the homepage, copy the short pairing code.
8. In Studio, paste that code into the plugin and click **Authorize and connect**.
9. The plugin reads the Roblox account already signed into Studio and sends that authorization back to Zest.
10. Once the homepage shows the Studio account as authorized, enter the workspace and click **Start sync**.

## How to use the new dashboard

### Homepage

- Use it as the product-facing landing page.
- The top CTA now sends people into the Roblox Studio authorization flow first.
- The app unlocks only after the plugin confirms the Roblox account already signed into Studio.

### Guest workspace layer

- Projects are local-first and work from a workspace token.
- `workspace-state` can create or refresh a guest workspace record without email auth.
- If you later add Supabase Auth, the repo still supports owner-backed workspaces too.

### Projects

- Use **New Workspace** to spin up another isolated token.
- Each workspace gets its own pairing code and message/job history.
- Switching workspaces changes the memory thread and job feed source.

### Model marketplace

- Every workspace stores its own planner model key.
- The selected model is sent to the `generate-job` Edge Function with the prompt.
- Providers currently supported are Groq, OpenAI, Anthropic, Google Gemini, and Moonshot Kimi.
- Groq is the intended free-first starting point.
- If a provider secret is not configured, that model simply shows as unavailable.

### Credits and plans

- The billing layer still exists in the repo for later.
- The guest path no longer depends on Stripe or credit purchases to function.
- Unauthenticated guest generations currently run as free guest jobs.

### Code packs

- Packs are the inventory-like context layer for common systems.
- Selecting a pack injects additional system context into the planner request.
- Example packs include inventory, economy, combat, rounds, saving, and plots.

### Studio flow

1. Pick the active project.
2. Choose the model.
3. Toggle the packs you want attached.
4. Describe the mechanic in the composer.
5. The planner creates structured operations.
6. The plugin claims the job and writes the changes in Studio.

## Supported plugin operations

The current MVP supports:

- `ensure_instance`
- `upsert_script`
- `delete_instance`

That means the planner can create folder structure, create GUI containers, write server/client/module scripts, and remove exact paths when explicitly requested.

## Notes

- This project is still intentionally conservative. The plugin applies structured edits instead of executing arbitrary generated plugin-side Lua.
- Guest workspaces trade some security for a much easier MVP path, because the workspace token now acts as the main capability for the free flow.
- The multi-provider router expects you to configure only the providers you actually want to use. Missing provider secrets simply make those model options unavailable.
- Real payments are now scaffolded, but you still need to create the matching Stripe products, prices, and webhook endpoint in your own Stripe account.
- The next strong upgrade would be typed property edits, richer UI tree generation, org collaboration, and code-pack uploads backed by stored snippets instead of only descriptive context.
