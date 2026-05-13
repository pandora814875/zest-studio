import { corsHeaders } from "../_shared/cors.ts";
import { getWorkspaceBillingState } from "../_shared/billing.ts";
import {
  createAdminClient,
  getWorkspaceByToken,
  requireString,
  touchWorkspace,
} from "../_shared/workspace.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const body = await request.json();
    const action = requireString(body.action, "action is required.");
    const workspaceToken = requireString(body.workspaceToken, "workspaceToken is required.");
    const pluginName =
      typeof body.pluginName === "string" && body.pluginName.trim()
        ? body.pluginName.trim()
        : "RoboLua Plugin";

    const workspace = await getWorkspaceByToken(admin, workspaceToken);
    await touchWorkspace(admin, workspace.id, pluginName);

    if (action === "claim") {
      const { data: job, error } = await admin.rpc("claim_next_job", {
        p_workspace_id: workspace.id,
        p_plugin_name: pluginName,
      });

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          ok: true,
          job,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (action === "complete") {
      const jobId = requireString(body.jobId, "jobId is required.");
      const status = requireString(body.status, "status is required.");

      if (!["applied", "failed"].includes(status)) {
        throw new Error("status must be applied or failed.");
      }

      const resultLog = Array.isArray(body.resultLog) ? body.resultLog : [];
      const lastError = typeof body.lastError === "string" ? body.lastError : "";

      const { data: job, error } = await admin.rpc("complete_job", {
        p_job_id: jobId,
        p_workspace_id: workspace.id,
        p_status: status,
        p_result_log: resultLog,
        p_last_error: lastError,
        p_plugin_name: pluginName,
      });

      if (error) {
        throw error;
      }

      if (!job) {
        throw new Error("Job completion did not return a matching row.");
      }

      const content =
        status === "applied"
          ? `Studio applied "${job.title}" successfully.`
          : `Studio failed to apply "${job.title}". ${lastError || "No extra error details were returned."}`;

      const { error: messageError } = await admin.from("chat_messages").insert({
        workspace_id: workspace.id,
        role: "assistant",
        content,
        metadata: {
          job_id: job.id,
          result: status,
        },
      });

      if (messageError) {
        throw messageError;
      }

      const billing = await getWorkspaceBillingState(admin, workspace.id);

      return new Response(
        JSON.stringify({
          ok: true,
          job,
          billing,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    throw new Error("Unsupported action.");
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
