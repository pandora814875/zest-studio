import { corsHeaders } from "../_shared/cors.ts";
import { buildWorkspaceState } from "../_shared/workspace-state.ts";
import {
  createAdminClient,
  ensureGuestWorkspace,
  getWorkspaceByToken,
  readOptionalUser,
  requireOwnedWorkspace,
  requireString,
} from "../_shared/workspace.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const body = await request.json();
    const workspaceToken = requireString(body.workspaceToken, "workspaceToken is required.");
    const user = await readOptionalUser(request);
    const workspace = user
      ? await requireOwnedWorkspace(admin, user.id, workspaceToken)
      : body.ensure
        ? await ensureGuestWorkspace(admin, {
            workspaceToken,
            displayName:
              typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined,
            description: typeof body.description === "string" ? body.description : undefined,
            modelKey: typeof body.modelKey === "string" ? body.modelKey : undefined,
            selectedPacks: Array.isArray(body.selectedPacks) ? body.selectedPacks : undefined,
          })
        : await getWorkspaceByToken(admin, workspaceToken);
    const state = await buildWorkspaceState(admin, workspace);

    return new Response(
      JSON.stringify({
        ...state,
        accessMode: user ? "owned" : "guest",
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
