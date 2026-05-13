import { corsHeaders } from "../_shared/cors.ts";
import {
  claimDailyCredits,
  purchaseCreditPack,
  setWorkspacePlan,
} from "../_shared/billing.ts";
import {
  createAdminClient,
  requireOwnedWorkspace,
  requireString,
  requireUser,
} from "../_shared/workspace.ts";
import { buildWorkspaceState } from "../_shared/workspace-state.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const user = await requireUser(request);
    const body = await request.json();
    const action = requireString(body.action, "action is required.");
    const workspaceToken = requireString(body.workspaceToken, "workspaceToken is required.");
    const workspace = await requireOwnedWorkspace(admin, user.id, workspaceToken);

    if (action === "claim_daily") {
      await claimDailyCredits(admin, workspace.id);
    } else if (action === "set_plan") {
      const planTier = requireString(body.planTier, "planTier is required.");
      if (!["free", "pro", "studio"].includes(planTier)) {
        throw new Error("planTier must be free, pro, or studio.");
      }

      await setWorkspacePlan(admin, workspace.id, planTier as "free" | "pro" | "studio");
    } else if (action === "buy_credits") {
      const packId = requireString(body.packId, "packId is required.");
      await purchaseCreditPack(admin, workspace.id, packId);
    } else {
      throw new Error("Unsupported billing action.");
    }

    const state = await buildWorkspaceState(admin, workspace);

    return new Response(JSON.stringify(state), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
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
