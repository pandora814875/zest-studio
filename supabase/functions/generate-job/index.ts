import { corsHeaders } from "../_shared/cors.ts";
import { applyWalletDelta, ensureWorkspaceWallet } from "../_shared/billing.ts";
import { resolveModelChoice } from "../_shared/catalog.ts";
import { requestPlanFromProvider } from "../_shared/providers.ts";
import { buildWorkspaceState } from "../_shared/workspace-state.ts";
import { createAdminClient, requireOwnedWorkspace, requireString, requireUser } from "../_shared/workspace.ts";

const ROBLOX_PLAN_SCHEMA = {
  name: "roblox_studio_plan",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      explanation: { type: "string" },
      manual_steps: {
        type: "array",
        items: { type: "string" },
      },
      operations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            type: {
              type: "string",
              enum: ["ensure_instance", "upsert_script", "delete_instance"],
            },
            description: { type: "string" },
            parent_path: { type: "string" },
            name: { type: "string" },
            class_name: { type: "string" },
            script_type: { type: "string" },
            source: { type: "string" },
            path: { type: "string" },
          },
          required: [
            "type",
            "description",
            "parent_path",
            "name",
            "class_name",
            "script_type",
            "source",
            "path",
          ],
        },
      },
    },
    required: ["title", "summary", "explanation", "manual_steps", "operations"],
  },
};

function buildSystemPrompt() {
  return [
    "You are RoboLua Planner, an expert Roblox Studio implementation planner.",
    "You do not return prose outside the requested JSON schema.",
    "Generate operations that a Roblox Studio plugin can safely apply.",
    "Supported operation types:",
    "1. ensure_instance: Create or confirm an instance under parent_path with class_name and name.",
    "2. upsert_script: Create or update Script, LocalScript, or ModuleScript under parent_path with source.",
    "3. delete_instance: Delete the exact path only when the user explicitly asks to remove or replace something.",
    "Use Roblox service roots like ServerScriptService, ReplicatedStorage, StarterGui, StarterPlayer, StarterPlayerScripts, Workspace, ServerStorage, Lighting, and SoundService.",
    "When you need folders, create them with ensure_instance using class_name Folder.",
    "Prefer a few clear scripts over many fragmented ones.",
    "All source must be complete, runnable Luau with helpful inline comments.",
    "Never rely on unsupported plugin behavior such as executing arbitrary remote code.",
    "If a request needs manual setup, add it to manual_steps.",
    "If the user is editing an earlier idea, use the conversation history to preserve continuity.",
    "If a field does not apply to an operation, still include it as an empty string.",
  ].join("\n");
}

function sanitizeOperations(operations: unknown[]) {
  return operations.map((operation) => {
    const record =
      typeof operation === "object" && operation ? (operation as Record<string, unknown>) : {};

    return {
      type: String(record.type || ""),
      description: String(record.description || ""),
      parent_path: String(record.parent_path || ""),
      name: String(record.name || ""),
      class_name: String(record.class_name || ""),
      script_type: String(record.script_type || ""),
      source: String(record.source || ""),
      path: String(record.path || ""),
    };
  });
}

function sanitizeSelectedPacks(packs: unknown) {
  if (!Array.isArray(packs)) {
    return [];
  }

  return packs
    .map((pack) => {
      const record = typeof pack === "object" && pack ? (pack as Record<string, unknown>) : {};

      return {
        id: String(record.id || ""),
        name: String(record.name || ""),
        blurb: String(record.blurb || ""),
        systems: String(record.systems || ""),
      };
    })
    .filter((pack) => pack.name || pack.blurb || pack.systems);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let chargeApplied = false;
  let chargedWorkspaceId = "";
  let chargedAmount = 0;
  let chargedSummary = "";
  let chargedMetadata: Record<string, unknown> = {};

  try {
    const admin = createAdminClient();
    const user = await requireUser(request);
    const body = await request.json();
    const workspaceToken = requireString(body.workspaceToken, "workspaceToken is required.");
    const prompt = requireString(body.prompt, "prompt is required.");
    const requestedModel =
      typeof body.modelKey === "string" && body.modelKey.trim()
        ? body.modelKey.trim()
        : typeof body.model === "string" && body.model.trim()
          ? body.model.trim()
          : undefined;
    const projectDescription =
      typeof body.projectDescription === "string" && body.projectDescription.trim()
        ? body.projectDescription.trim()
        : "";
    const selectedPacks = sanitizeSelectedPacks(body.selectedPacks);

    const workspace = await requireOwnedWorkspace(admin, user.id, workspaceToken);
    const wallet = await ensureWorkspaceWallet(admin, workspace.id);
    const selectedModel = resolveModelChoice(requestedModel);

    if (wallet.credits_balance < selectedModel.creditCost) {
      throw new Error(
        `${selectedModel.label} costs ${selectedModel.creditCost} credits, but this workspace only has ${wallet.credits_balance}.`,
      );
    }

    const { data: userMessage, error: insertUserError } = await admin
      .from("chat_messages")
      .insert({
        workspace_id: workspace.id,
        role: "user",
        content: prompt,
      })
      .select("*")
      .single();

    if (insertUserError) {
      throw insertUserError;
    }

    const { data: historyRows, error: historyError } = await admin
      .from("chat_messages")
      .select("role, content")
      .eq("workspace_id", workspace.id)
      .order("created_at", { ascending: false })
      .limit(14);

    if (historyError) {
      throw historyError;
    }

    const orderedHistory = [...historyRows].reverse();
    const plannerInput = [
      { role: "system", content: buildSystemPrompt() },
      ...(projectDescription
        ? [
            {
              role: "system",
              content: `Project brief:\n${projectDescription}`,
            },
          ]
        : []),
      ...(selectedPacks.length
        ? [
            {
              role: "system",
              content: [
                "Attached pack context:",
                ...selectedPacks.map(
                  (pack) =>
                    `- ${pack.name}: ${pack.blurb}${pack.systems ? ` | ${pack.systems}` : ""}`,
                ),
              ].join("\n"),
            },
          ]
        : []),
      ...orderedHistory.map((row) => ({
        role: row.role === "assistant" ? "assistant" : "user",
        content: row.content,
      })),
    ];

    const { model, plan } = await requestPlanFromProvider(requestedModel, plannerInput, ROBLOX_PLAN_SCHEMA);

    chargedWorkspaceId = workspace.id;
    chargedAmount = model.creditCost;
    chargedSummary = `${model.label} generation`;
    chargedMetadata = {
      modelKey: model.key,
      provider: model.providerLabel,
      apiModel: model.apiModel,
      prompt,
    };

    await applyWalletDelta(
      admin,
      workspace.id,
      -model.creditCost,
      "spend",
      chargedSummary,
      chargedMetadata,
    );
    chargeApplied = true;

    const operations = sanitizeOperations(Array.isArray(plan.operations) ? plan.operations : []);
    const manualSteps = Array.isArray(plan.manual_steps)
      ? plan.manual_steps.map((step: unknown) => String(step))
      : [];

    const { data: job, error: jobError } = await admin
      .from("jobs")
      .insert({
        workspace_id: workspace.id,
        title: String(plan.title || "Untitled plan"),
        prompt,
        model_key: model.key,
        provider_key: model.provider,
        requested_model: model.apiModel,
        credit_cost: model.creditCost,
        summary: String(plan.summary || ""),
        explanation: String(plan.explanation || ""),
        operations,
        manual_steps: manualSteps,
        status: "queued",
      })
      .select("*")
      .single();

    if (jobError) {
      throw jobError;
    }

    const assistantContent = [
      `${plan.title || "Plan queued"}`,
      String(plan.summary || ""),
      String(plan.explanation || ""),
      `Model: ${model.label} (${model.providerLabel}) - ${model.creditCost} credits`,
      manualSteps.length ? `Manual steps: ${manualSteps.join(" | ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error: insertAssistantError } = await admin.from("chat_messages").insert({
      workspace_id: workspace.id,
      role: "assistant",
      content: assistantContent,
      metadata: {
        job_id: job.id,
        model_key: model.key,
      },
    });

    if (insertAssistantError) {
      throw insertAssistantError;
    }

    const state = await buildWorkspaceState(admin, workspace);

    return new Response(
      JSON.stringify({
        job,
        workspace: state,
        insertedMessageId: userMessage.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    if (chargeApplied && chargedWorkspaceId && chargedAmount > 0) {
      try {
        const admin = createAdminClient();
        await applyWalletDelta(
          admin,
          chargedWorkspaceId,
          chargedAmount,
          "refund",
          `Refund for failed ${chargedSummary}`,
          chargedMetadata,
        );
      } catch {
        // Best effort refund. If this fails, the billing ledger will need manual review.
      }
    }

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
