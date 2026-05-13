import { corsHeaders } from "../_shared/cors.ts";
import {
  createAdminClient,
  ensureOwnedWorkspace,
  listOwnedWorkspaces,
  requireString,
  requireUser,
  toProjectSummary,
  updateOwnedWorkspace,
} from "../_shared/workspace.ts";

function packIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item || "").trim()).filter(Boolean);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const action =
      typeof body.action === "string" && body.action.trim() ? body.action.trim() : "list";

    if (action === "create") {
      await ensureOwnedWorkspace(admin, user, {
        workspaceToken:
          typeof body.workspaceToken === "string" && body.workspaceToken.trim()
            ? body.workspaceToken.trim()
            : undefined,
        displayName:
          typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Roblox Workspace",
        description: typeof body.description === "string" ? body.description : "",
        modelKey: typeof body.modelKey === "string" ? body.modelKey : "openai/gpt-4.1-mini",
        selectedPacks: packIds(body.selectedPacks),
      });
    } else if (action === "update") {
      const workspaceToken = requireString(body.workspaceToken, "workspaceToken is required.");
      await updateOwnedWorkspace(admin, user.id, workspaceToken, {
        displayName: typeof body.name === "string" ? body.name : undefined,
        description: typeof body.description === "string" ? body.description : undefined,
        modelKey: typeof body.modelKey === "string" ? body.modelKey : undefined,
        selectedPacks: Array.isArray(body.selectedPacks) ? packIds(body.selectedPacks) : undefined,
      });
    } else if (action === "archive") {
      const workspaceToken = requireString(body.workspaceToken, "workspaceToken is required.");
      await updateOwnedWorkspace(admin, user.id, workspaceToken, {
        isArchived: true,
      });
    } else if (action !== "list") {
      throw new Error("Unsupported project action.");
    }

    const projects = (await listOwnedWorkspaces(admin, user.id)).map((workspace) =>
      toProjectSummary(workspace),
    );

    return new Response(
      JSON.stringify({
        ok: true,
        user: {
          id: user.id,
          email: user.email || "",
        },
        projects,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
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
