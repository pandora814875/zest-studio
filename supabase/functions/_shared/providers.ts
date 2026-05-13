import { resolveModelChoice } from "./catalog.ts";
import { buildStarterPlan } from "./starter-planner.ts";

export type PlannerMessage = {
  role: string;
  content: string;
};

type JsonSchemaFormat = {
  name: string;
  strict: boolean;
  schema: Record<string, unknown>;
};

function extractTextFromOpenAIResponse(payload: Record<string, unknown>) {
  const outputItems = Array.isArray(payload.output) ? payload.output : [];

  return (
    payload.output_text ||
    outputItems
      .flatMap((item: Record<string, unknown>) => {
        if (item.type !== "message") {
          return [];
        }

        const content = Array.isArray(item.content) ? item.content : [];
        return content
          .filter((part: Record<string, unknown>) => part.type === "output_text")
          .map((part: Record<string, unknown>) => String(part.text || ""));
      })
      .join("")
  );
}

function extractJsonText(raw: string) {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return withoutFence.slice(firstBrace, lastBrace + 1);
  }

  return withoutFence;
}

function providerPrompt(messages: PlannerMessage[]) {
  return messages
    .map((message) => `[${message.role.toUpperCase()}]\n${message.content}`)
    .join("\n\n");
}

export async function requestPlanFromProvider(
  requestedModel: string | undefined,
  messages: PlannerMessage[],
  schemaFormat: JsonSchemaFormat,
) {
  const selected = resolveModelChoice(requestedModel);
  let rawText = "";

  if (selected.provider === "built_in") {
    return {
      model: selected,
      plan: buildStarterPlan(messages),
    };
  } else if (selected.provider === "openai") {
    const apiKey = Deno.env.get(selected.secretEnv);
    if (!apiKey) {
      throw new Error(`${selected.secretEnv} is not configured.`);
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selected.apiModel,
        input: messages,
        text: {
          format: {
            type: "json_schema",
            ...schemaFormat,
          },
        },
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || "OpenAI request failed.");
    }

    rawText = String(extractTextFromOpenAIResponse(payload) || "");
  } else if (selected.provider === "anthropic") {
    const apiKey = Deno.env.get(selected.secretEnv);
    if (!apiKey) {
      throw new Error(`${selected.secretEnv} is not configured.`);
    }

    const system = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");

    const anthropicMessages = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: selected.apiModel,
        max_tokens: 8000,
        temperature: 0.2,
        system,
        messages: anthropicMessages,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || "Anthropic request failed.");
    }

    rawText = Array.isArray(payload.content)
      ? payload.content
          .filter((item: Record<string, unknown>) => item.type === "text")
          .map((item: Record<string, unknown>) => String(item.text || ""))
          .join("")
      : "";
  } else if (selected.provider === "gemini") {
    const apiKey = Deno.env.get(selected.secretEnv);
    if (!apiKey) {
      throw new Error(`${selected.secretEnv} is not configured.`);
    }

    const systemText = messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");

    const contents = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${selected.apiModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: systemText
            ? {
                parts: [{ text: systemText }],
              }
            : undefined,
          contents: contents.length
            ? contents
            : [
                {
                  role: "user",
                  parts: [{ text: providerPrompt(messages) }],
                },
              ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || "Gemini request failed.");
    }

    rawText = Array.isArray(payload.candidates)
      ? payload.candidates
          .flatMap((candidate: Record<string, unknown>) => {
            const content = candidate.content as Record<string, unknown> | undefined;
            const parts = Array.isArray(content?.parts) ? content.parts : [];
            return parts.map((part: Record<string, unknown>) => String(part.text || ""));
          })
          .join("")
      : "";
  } else {
    const apiKey = Deno.env.get(selected.secretEnv);
    const baseUrl =
      (selected.baseUrlEnv ? Deno.env.get(selected.baseUrlEnv) : undefined) ||
      selected.defaultBaseUrl;

    if (!apiKey || !baseUrl) {
      throw new Error(
        `${selected.secretEnv}${selected.baseUrlEnv ? ` or ${selected.baseUrlEnv}` : ""} is not configured.`,
      );
    }

    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selected.apiModel,
        temperature: 0.2,
        response_format: {
          type: "json_object",
        },
        messages: messages.map((message) => ({
          role: message.role === "assistant" ? "assistant" : message.role === "system" ? "system" : "user",
          content: message.content,
        })),
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || "OpenAI-compatible provider request failed.");
    }

    rawText = String(payload.choices?.[0]?.message?.content || "");
  }

  if (!rawText.trim()) {
    throw new Error(`The selected provider did not return JSON text for ${selected.label}.`);
  }

  return {
    model: selected,
    plan: JSON.parse(extractJsonText(rawText)),
  };
}
