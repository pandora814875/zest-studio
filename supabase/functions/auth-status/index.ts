import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/workspace.ts";

async function readAuthProviders() {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.customProviders.listProviders({
    type: "oidc",
  });

  if (error) {
    throw error;
  }

  const roblox =
    data.providers.find((provider) => provider.identifier === "custom:roblox") || null;

  return {
    roblox: {
      configured: Boolean(roblox),
      enabled: roblox?.enabled ?? false,
      emailOptional: roblox?.email_optional ?? false,
      identifier: roblox?.identifier ?? "custom:roblox",
    },
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authProviders = await readAuthProviders();

    return new Response(JSON.stringify({ authProviders }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unable to inspect auth providers.",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
