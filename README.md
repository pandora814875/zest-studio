# Zest Studio

Zest Studio is a Lemonade-style Roblox builder split into three connected layers:

1. A public-facing React app with a homepage and a richer studio dashboard.
2. Supabase tables plus Edge Functions that store project memory and turn prompts into structured Roblox operations.
3. A Roblox Studio plugin that claims queued jobs, applies safe edits, and reports the result back.

## What is in this version

- A product homepage plus a more ambitious studio dashboard.
- Account-based workspace ownership with Supabase Auth.
- Multi-project cloud workspace management with isolated workspace tokens.
- Multi-provider model routing across OpenAI, Anthropic, Gemini, and Kimi.
- A workspace credit wallet with daily claims, plans, packs, and ledger history.
- Stripe checkout, customer portal, and webhook scaffolding for paid plans and credit packs.
- Inventory-like code packs that add reusable system context to prompts.
- The original plugin pairing, job feed, and memory thread flow.

## Folder map

- `src/` - Vite + React frontend.
- `supabase/schema.sql` - database schema plus RPC helpers.
- `supabase/functions/` - auth-protected app functions, billing functions, Stripe endpoints, and plugin-sync.
- `plugin/robolua-plugin.lua` - Roblox Studio plugin source.

## Setup

### 1. Create the Supabase project

1. Open the Supabase dashboard.
2. Create a new project.
3. Open the SQL editor.
4. Run the SQL from [supabase/schema.sql](./supabase/schema.sql).
5. In **Authentication > Providers**, enable email/password sign-in.
6. In **Authentication > URL Configuration**, set your site URL for the frontend you will deploy.

### Optional but recommended: Roblox login via OIDC

To match the easier Lemonade-style login flow, add Roblox as a custom OIDC provider in Supabase Auth:

1. In the Roblox Creator Dashboard, create an OAuth 2.0 app.
2. In Supabase, go to **Authentication > Providers > New Provider**.
3. Choose **Auto-discovery (OIDC)**.
4. Use the identifier `custom:roblox`.
5. Set the issuer to `https://apis.roblox.com/oauth/`.
6. Copy the callback URL shown by Supabase and paste it into your Roblox OAuth app.
7. Use scopes like `openid profile email verification`.
8. If you want Roblox login to work even when the account does not share an email, enable Supabase's email-optional setting for the provider.

The frontend already calls `signInWithOAuth({ provider: "custom:roblox" })`, so once those Roblox credentials are in place the button will work without more code changes.

If you see this runtime error:

`Unsupported provider: custom provider custom:roblox not found`

it means the frontend is ready but Supabase does not have the Roblox provider registered yet.

You can set it up with the included helper after creating a Roblox OAuth app:

```bash
set SUPABASE_URL=https://atycbrnthkgbrsxyabbs.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
set ROBLOX_CLIENT_ID=your-roblox-client-id
set ROBLOX_CLIENT_SECRET=your-roblox-client-secret
npm run setup:roblox-provider
```

### 2. Add the provider and billing secrets

Set these Edge Function secrets in Supabase:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `MOONSHOT_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_STUDIO_MONTHLY`
- `STRIPE_PRICE_PACK_BOOST_25`
- `STRIPE_PRICE_PACK_BUILDER_120`
- `STRIPE_PRICE_PACK_STUDIO_500`

Optional:

- `MOONSHOT_BASE_URL`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- `STRIPE_PORTAL_RETURN_URL`

`OPENAI_MODEL` is the fallback planner model if a request does not provide a model key. In normal use, the dashboard selects the model per project at runtime.

Example local secret file:

```bash
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4.1-mini
ANTHROPIC_API_KEY=your-anthropic-key
GEMINI_API_KEY=your-gemini-key
MOONSHOT_API_KEY=your-moonshot-key
MOONSHOT_BASE_URL=https://api.moonshot.ai/v1
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_STUDIO_MONTHLY=price_...
STRIPE_PRICE_PACK_BOOST_25=price_...
STRIPE_PRICE_PACK_BUILDER_120=price_...
STRIPE_PRICE_PACK_STUDIO_500=price_...
STRIPE_SUCCESS_URL=https://your-app.example/?checkout=success&session_id={CHECKOUT_SESSION_ID}
STRIPE_CANCEL_URL=https://your-app.example/?checkout=cancelled
STRIPE_PORTAL_RETURN_URL=https://your-app.example/
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
npx supabase functions deploy project-hub
npx supabase functions deploy provider-status --no-verify-jwt
npx supabase functions deploy workspace-state
npx supabase functions deploy generate-job
npx supabase functions deploy billing-control
npx supabase functions deploy create-checkout
npx supabase functions deploy customer-portal
npx supabase functions deploy plugin-sync --no-verify-jwt
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

`supabase/config.toml` now splits the surface correctly:

- App-facing functions require a valid Supabase user JWT.
- `plugin-sync` stays public and uses the workspace token.
- `stripe-webhook` stays public and is protected by Stripe's webhook signature.

### 4. Start the frontend

Copy `.env.example` to `.env`, fill the two `VITE_` values, then run:

```bash
npm install
npm run dev
```

You will use:

- `VITE_SUPABASE_URL` - your project URL.
- `VITE_SUPABASE_ANON_KEY` - your public or legacy anon key.

### 5. Point Stripe to the webhook

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
7. In the dashboard, copy the short pairing code.
8. In Studio, paste that code into the plugin and click **Connect with code**.
9. Click **Start sync**.

## How to use the new dashboard

### Homepage

- Use it as the product-facing landing page.
- The right hero area cycles through example system types.
- The top CTA now routes into sign-up or the studio workspace depending on auth state.

### Account layer

- Users sign in with Supabase Auth before they can create or manage cloud workspaces.
- Projects are no longer only browser-local; they are attached to the signed-in account.
- The app keeps the workspace token for plugin pairing, but ownership is verified server-side.

### Projects

- Use **New Project** to spin up another isolated workspace.
- Each project gets its own workspace token and owner-backed cloud record.
- Switching projects changes the memory thread and job feed source.

### Model marketplace

- Every project stores its own planner model key.
- The selected model is sent to the `generate-job` Edge Function with the prompt.
- Providers currently supported are OpenAI, Anthropic, Google Gemini, and Moonshot Kimi.
- Each model has its own speed/depth profile and credit cost.
- If a model key is missing or a provider secret is not configured, the function falls back gracefully.

### Credits and plans

- Every workspace has a credit wallet stored in Supabase.
- Credits are consumed when a generation job succeeds.
- Daily claims are handled by the `billing-control` Edge Function.
- Paid plan upgrades and credit pack purchases are opened through Stripe checkout.
- Billing management can be routed to the Stripe customer portal.
- Current plan tiers are `free`, `pro`, and `studio`.
- Stripe webhooks sync subscription state and paid credit packs back into the workspace wallet.

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
- Workspaces are now account-owned, but collaboration and org/team roles are still not implemented yet.
- The multi-provider router expects you to configure only the providers you actually want to use. Missing provider secrets simply make those model options unavailable.
- Real payments are now scaffolded, but you still need to create the matching Stripe products, prices, and webhook endpoint in your own Stripe account.
- The next strong upgrade would be typed property edits, richer UI tree generation, org collaboration, and code-pack uploads backed by stored snippets instead of only descriptive context.
