import { createClient, type User } from "npm:@supabase/supabase-js@2";
import { ensureWorkspaceWallet } from "./billing.ts";

export type WorkspaceRow = {
  id: string;
  token_hash: string;
  token_value: string | null;
  owner_user_id: string | null;
  display_name: string;
  description: string;
  model_key: string;
  selected_packs: string[];
  is_archived: boolean;
  paired_plugin_name?: string | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  stripe_checkout_session_id?: string | null;
  billing_status?: string | null;
  billing_interval?: string | null;
  last_seen_at?: string | null;
  created_at: string;
  updated_at: string;
};

type OwnedWorkspaceInput = {
  workspaceToken?: string;
  displayName?: string;
  description?: string;
  modelKey?: string;
  selectedPacks?: string[];
};

type OwnedWorkspacePatch = {
  displayName?: string;
  description?: string;
  modelKey?: string;
  selectedPacks?: string[];
  isArchived?: boolean;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeCheckoutSessionId?: string | null;
  billingStatus?: string | null;
  billingInterval?: string | null;
};

function publishableKey() {
  return Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
}

function normalizePackIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 24);
}

export function createWorkspaceToken() {
  return crypto.randomUUID().replaceAll("-", "");
}

export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server credentials are missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function createUserClient(request: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = publishableKey();
  const authHeader = request.headers.get("Authorization");

  if (!url || !anonKey || !authHeader) {
    throw new Error("Supabase user credentials are missing.");
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireUser(request: Request) {
  const client = createUserClient(request);
  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required.");
  }

  return user;
}

export async function ensureProfile(
  admin: ReturnType<typeof createAdminClient>,
  user: User,
) {
  const displayNameCandidates = [
    typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "",
    typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "",
    typeof user.user_metadata?.preferred_username === "string"
      ? user.user_metadata.preferred_username
      : "",
    typeof user.user_metadata?.user_name === "string" ? user.user_metadata.user_name : "",
    typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : "",
    typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "",
    typeof user.email === "string" && user.email.includes("@")
      ? user.email.split("@")[0]
      : "",
  ];
  const displayName = displayNameCandidates.find((value) => value.trim()) || "";

  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email || null,
      display_name: displayName,
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw error;
  }
}

export async function sha256Hex(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((chunk) => chunk.toString(16).padStart(2, "0"))
    .join("");
}

export async function findWorkspaceByToken(
  admin: ReturnType<typeof createAdminClient>,
  workspaceToken: string,
) {
  const tokenHash = await sha256Hex(workspaceToken.trim());
  const { data, error } = await admin
    .from("workspaces")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as WorkspaceRow | null;
}

export async function getWorkspaceByToken(
  admin: ReturnType<typeof createAdminClient>,
  workspaceToken: string,
) {
  const workspace = await findWorkspaceByToken(admin, workspaceToken);

  if (!workspace) {
    throw new Error("Workspace token not found. Create the project in the dashboard first.");
  }

  await ensureWorkspaceWallet(admin, workspace.id);
  return workspace;
}

export async function getWorkspaceById(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
) {
  const { data, error } = await admin.from("workspaces").select("*").eq("id", workspaceId).single();

  if (error) {
    throw error;
  }

  await ensureWorkspaceWallet(admin, data.id);
  return data as WorkspaceRow;
}

export async function listOwnedWorkspaces(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
) {
  const { data, error } = await admin
    .from("workspaces")
    .select("*")
    .eq("owner_user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as WorkspaceRow[];
}

export async function ensureOwnedWorkspace(
  admin: ReturnType<typeof createAdminClient>,
  user: User,
  input: OwnedWorkspaceInput = {},
) {
  await ensureProfile(admin, user);

  const workspaceToken = input.workspaceToken?.trim() || createWorkspaceToken();
  const existing = await findWorkspaceByToken(admin, workspaceToken);
  const displayName = input.displayName?.trim() || "Roblox Workspace";
  const description = input.description?.trim() || "";
  const modelKey = input.modelKey?.trim() || "openai/gpt-4.1-mini";
  const selectedPacks = normalizePackIds(input.selectedPacks);

  if (existing) {
    if (existing.owner_user_id && existing.owner_user_id !== user.id) {
      throw new Error("This workspace token already belongs to another account.");
    }

    const { data, error } = await admin
      .from("workspaces")
      .update({
        token_value: workspaceToken,
        owner_user_id: user.id,
        display_name: displayName,
        description,
        model_key: modelKey,
        selected_packs: selectedPacks,
        is_archived: false,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await ensureWorkspaceWallet(admin, data.id);
    return data as WorkspaceRow;
  }

  const tokenHash = await sha256Hex(workspaceToken);
  const { data, error } = await admin
    .from("workspaces")
    .insert({
      token_hash: tokenHash,
      token_value: workspaceToken,
      owner_user_id: user.id,
      display_name: displayName,
      description,
      model_key: modelKey,
      selected_packs: selectedPacks,
      billing_status: "free",
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await ensureWorkspaceWallet(admin, data.id);
  return data as WorkspaceRow;
}

export async function requireOwnedWorkspace(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  workspaceToken: string,
) {
  const workspace = await getWorkspaceByToken(admin, workspaceToken);

  if (workspace.owner_user_id !== userId) {
    throw new Error("You do not have access to this workspace.");
  }

  if (workspace.is_archived) {
    throw new Error("This workspace has been archived.");
  }

  return workspace;
}

export async function updateOwnedWorkspace(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  workspaceToken: string,
  patch: OwnedWorkspacePatch,
) {
  const workspace = await requireOwnedWorkspace(admin, userId, workspaceToken);
  const updates: Record<string, unknown> = {};

  if (typeof patch.displayName === "string") {
    updates.display_name = patch.displayName.trim() || workspace.display_name;
  }

  if (typeof patch.description === "string") {
    updates.description = patch.description.trim();
  }

  if (typeof patch.modelKey === "string" && patch.modelKey.trim()) {
    updates.model_key = patch.modelKey.trim();
  }

  if (patch.selectedPacks) {
    updates.selected_packs = normalizePackIds(patch.selectedPacks);
  }

  if (typeof patch.isArchived === "boolean") {
    updates.is_archived = patch.isArchived;
  }

  if (patch.stripeCustomerId !== undefined) {
    updates.stripe_customer_id = patch.stripeCustomerId;
  }

  if (patch.stripeSubscriptionId !== undefined) {
    updates.stripe_subscription_id = patch.stripeSubscriptionId;
  }

  if (patch.stripePriceId !== undefined) {
    updates.stripe_price_id = patch.stripePriceId;
  }

  if (patch.stripeCheckoutSessionId !== undefined) {
    updates.stripe_checkout_session_id = patch.stripeCheckoutSessionId;
  }

  if (patch.billingStatus !== undefined) {
    updates.billing_status = patch.billingStatus;
  }

  if (patch.billingInterval !== undefined) {
    updates.billing_interval = patch.billingInterval;
  }

  if (!Object.keys(updates).length) {
    return workspace;
  }

  const { data, error } = await admin
    .from("workspaces")
    .update(updates)
    .eq("id", workspace.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as WorkspaceRow;
}

export async function touchWorkspace(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  pluginName?: string,
) {
  const payload: Record<string, string> = {
    last_seen_at: new Date().toISOString(),
  };

  if (pluginName?.trim()) {
    payload.paired_plugin_name = pluginName.trim();
  }

  const { error } = await admin.from("workspaces").update(payload).eq("id", workspaceId);

  if (error) {
    throw error;
  }
}

export function toProjectSummary(workspace: WorkspaceRow) {
  return {
    id: workspace.id,
    name: workspace.display_name,
    description: workspace.description || "",
    workspaceToken: workspace.token_value || "",
    modelKey: workspace.model_key || "openai/gpt-4.1-mini",
    selectedPacks: Array.isArray(workspace.selected_packs) ? workspace.selected_packs : [],
    createdAt: workspace.created_at,
    billingStatus: workspace.billing_status || "free",
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export function requireString(value: unknown, message: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

export function isPluginOnline(lastSeenAt?: string | null) {
  if (!lastSeenAt) {
    return false;
  }

  return Date.now() - new Date(lastSeenAt).getTime() < 20_000;
}
