import { corsHeaders } from "../_shared/cors.ts";
import { buildWorkspaceState } from "../_shared/workspace-state.ts";
import { createAdminClient, requireOwnedWorkspace, requireString, requireUser } from "../_shared/workspace.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const user = await requireUser(request);
    const body = await request.json();
    const workspaceToken = requireString(body.workspaceToken, "workspaceToken is required.");
    const workspace = await requireOwnedWorkspace(admin, user.id, workspaceToken);
    const state = await buildWorkspaceState(admin, workspace);

    return new Response(
      JSON.stringify(state),
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
