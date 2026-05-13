import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getWorkspaceBillingState } from "./billing.ts";
import { getModelCatalog } from "./catalog.ts";
import { isPluginOnline, toProjectSummary } from "./workspace.ts";

type WorkspaceRow = {
  id: string;
  display_name: string;
  paired_plugin_name?: string | null;
  last_seen_at?: string | null;
};

async function getAuthProviderState(admin: SupabaseClient) {
  try {
    const { data, error } = await admin.auth.admin.customProviders.listProviders({
      type: "oidc",
    });

    if (error) {
      return {
        roblox: {
          configured: false,
          enabled: false,
          error: error.message,
        },
      };
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
  } catch (error) {
    return {
      roblox: {
        configured: false,
        enabled: false,
        error: error instanceof Error ? error.message : "Unable to inspect auth providers.",
      },
    };
  }
}

export async function buildWorkspaceState(
  admin: SupabaseClient,
  workspace: WorkspaceRow,
) {
  const [
    { data: messages, error: messagesError },
    { data: jobs, error: jobsError },
    billing,
    authProviders,
  ] = await Promise.all([
      admin
        .from("chat_messages")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(18),
      admin
        .from("jobs")
        .select("*")
        .eq("workspace_id", workspace.id)
        .order("created_at", { ascending: false })
        .limit(12),
      getWorkspaceBillingState(admin, workspace.id),
      getAuthProviderState(admin),
    ]);

  if (messagesError) {
    throw messagesError;
  }

  if (jobsError) {
    throw jobsError;
  }

  return {
    project: toProjectSummary(workspace),
    workspace,
    pluginOnline: isPluginOnline(workspace.last_seen_at),
    messages,
    jobs,
    billing,
    modelCatalog: getModelCatalog(),
    authProviders,
  };
}
