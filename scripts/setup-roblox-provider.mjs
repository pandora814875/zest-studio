import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
const clientId = process.env.ROBLOX_CLIENT_ID;
const clientSecret = process.env.ROBLOX_CLIENT_SECRET;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL (or VITE_SUPABASE_URL).");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
}

if (!clientId || !clientSecret) {
  throw new Error("Missing ROBLOX_CLIENT_ID or ROBLOX_CLIENT_SECRET.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const providerIdentifier = "custom:roblox";
const providerPayload = {
  provider_type: "oidc",
  identifier: providerIdentifier,
  name: "Roblox",
  client_id: clientId,
  client_secret: clientSecret,
  issuer: "https://apis.roblox.com/oauth/",
  scopes: ["openid", "profile", "email", "verification"],
  pkce_enabled: true,
  email_optional: true,
  enabled: true,
};

const { data: current, error: currentError } =
  await admin.auth.admin.customProviders.getProvider(providerIdentifier);

if (currentError && currentError.status !== 404) {
  throw currentError;
}

if (!currentError && current) {
  const { data, error } = await admin.auth.admin.customProviders.updateProvider(
    providerIdentifier,
    {
      name: providerPayload.name,
      client_id: providerPayload.client_id,
      client_secret: providerPayload.client_secret,
      issuer: providerPayload.issuer,
      scopes: providerPayload.scopes,
      pkce_enabled: providerPayload.pkce_enabled,
      email_optional: providerPayload.email_optional,
      enabled: providerPayload.enabled,
    },
  );

  if (error) {
    throw error;
  }

  console.log(`Updated ${providerIdentifier}.`);
  console.log(JSON.stringify(data, null, 2));
} else {
  const { data, error } = await admin.auth.admin.customProviders.createProvider(providerPayload);

  if (error) {
    throw error;
  }

  console.log(`Created ${providerIdentifier}.`);
  console.log(JSON.stringify(data, null, 2));
}
