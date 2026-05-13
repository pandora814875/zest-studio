export type ProviderKind =
  | "built_in"
  | "openai"
  | "anthropic"
  | "gemini"
  | "openai_compatible";

export type ModelDefinition = {
  key: string;
  label: string;
  provider: ProviderKind;
  providerLabel: string;
  apiModel: string;
  creditCost: number;
  speedScore: number;
  depthScore: number;
  summary: string;
  secretEnv?: string;
  defaultBaseUrl?: string;
  baseUrlEnv?: string;
  freeStarter?: boolean;
};

const MODEL_CATALOG: ModelDefinition[] = [
  {
    key: "zest/starter-builder",
    label: "Zest Starter",
    provider: "built_in",
    providerLabel: "Built-in",
    apiModel: "zest-starter-builder",
    creditCost: 0,
    speedScore: 4,
    depthScore: 2,
    summary: "Zero-key starter planner that scaffolds common Roblox systems so the full site-to-Studio loop works for free.",
    freeStarter: true,
  },
  {
    key: "groq/openai-gpt-oss-20b",
    label: "GPT OSS 20B",
    provider: "openai_compatible",
    providerLabel: "Groq",
    apiModel: "openai/gpt-oss-20b",
    creditCost: 0,
    speedScore: 5,
    depthScore: 4,
    summary: "Free-friendly starter model on Groq with fast coding, planning, and structured JSON output.",
    secretEnv: "GROQ_API_KEY",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    baseUrlEnv: "GROQ_BASE_URL",
    freeStarter: true,
  },
  {
    key: "groq/llama-3.3-70b-versatile",
    label: "Llama 3.3 70B",
    provider: "openai_compatible",
    providerLabel: "Groq",
    apiModel: "llama-3.3-70b-versatile",
    creditCost: 0,
    speedScore: 5,
    depthScore: 3,
    summary: "Fast general-purpose generation through Groq for free-first Roblox prototyping.",
    secretEnv: "GROQ_API_KEY",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    baseUrlEnv: "GROQ_BASE_URL",
    freeStarter: true,
  },
  {
    key: "openai/gpt-4.1-mini",
    label: "GPT-4.1 Mini",
    provider: "openai",
    providerLabel: "OpenAI",
    apiModel: "gpt-4.1-mini",
    creditCost: 1,
    speedScore: 5,
    depthScore: 2,
    summary: "Fast drafts, responsive UI iteration, low-cost mechanic scaffolds.",
    secretEnv: "OPENAI_API_KEY",
  },
  {
    key: "openai/gpt-4.1",
    label: "GPT-4.1",
    provider: "openai",
    providerLabel: "OpenAI",
    apiModel: "gpt-4.1",
    creditCost: 3,
    speedScore: 4,
    depthScore: 4,
    summary: "Balanced coding and architecture quality for most Roblox systems.",
    secretEnv: "OPENAI_API_KEY",
  },
  {
    key: "openai/o4-mini",
    label: "o4-mini",
    provider: "openai",
    providerLabel: "OpenAI",
    apiModel: "o4-mini",
    creditCost: 4,
    speedScore: 3,
    depthScore: 5,
    summary: "More deliberate planning for larger or tightly-coupled game systems.",
    secretEnv: "OPENAI_API_KEY",
  },
  {
    key: "anthropic/claude-sonnet-4",
    label: "Claude Sonnet 4",
    provider: "anthropic",
    providerLabel: "Anthropic",
    apiModel: "claude-sonnet-4-20250514",
    creditCost: 3,
    speedScore: 4,
    depthScore: 4,
    summary: "Strong instruction following and reliable system decomposition.",
    secretEnv: "ANTHROPIC_API_KEY",
  },
  {
    key: "anthropic/claude-opus-4-1",
    label: "Claude Opus 4.1",
    provider: "anthropic",
    providerLabel: "Anthropic",
    apiModel: "claude-opus-4-1-20250805",
    creditCost: 6,
    speedScore: 2,
    depthScore: 5,
    summary: "Heavyweight reasoning for complex feature packs and large migrations.",
    secretEnv: "ANTHROPIC_API_KEY",
  },
  {
    key: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "gemini",
    providerLabel: "Google",
    apiModel: "gemini-2.5-flash",
    creditCost: 1,
    speedScore: 5,
    depthScore: 3,
    summary: "Fast and affordable prompting for everyday mechanic generation.",
    secretEnv: "GEMINI_API_KEY",
    freeStarter: true,
  },
  {
    key: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "gemini",
    providerLabel: "Google",
    apiModel: "gemini-2.5-pro",
    creditCost: 4,
    speedScore: 3,
    depthScore: 5,
    summary: "Long-context reasoning for dense codebases and more complex requests.",
    secretEnv: "GEMINI_API_KEY",
  },
  {
    key: "moonshot/kimi-k2.5",
    label: "Kimi K2.5",
    provider: "openai_compatible",
    providerLabel: "Moonshot",
    apiModel: "kimi-k2.5",
    creditCost: 2,
    speedScore: 4,
    depthScore: 4,
    summary: "High-quality coding and agentic planning through Kimi's OpenAI-compatible API.",
    secretEnv: "MOONSHOT_API_KEY",
    defaultBaseUrl: "https://api.moonshot.ai/v1",
    baseUrlEnv: "MOONSHOT_BASE_URL",
  },
  {
    key: "moonshot/kimi-k2-thinking",
    label: "Kimi K2 Thinking",
    provider: "openai_compatible",
    providerLabel: "Moonshot",
    apiModel: "kimi-k2-thinking",
    creditCost: 5,
    speedScore: 2,
    depthScore: 5,
    summary: "Longer reasoning path for ambitious planning and code-heavy generation.",
    secretEnv: "MOONSHOT_API_KEY",
    defaultBaseUrl: "https://api.moonshot.ai/v1",
    baseUrlEnv: "MOONSHOT_BASE_URL",
  },
];

export function getModelCatalog() {
  return MODEL_CATALOG.map((model) => ({
    ...model,
    enabled: model.provider === "built_in" || Boolean(model.secretEnv && Deno.env.get(model.secretEnv)),
  }));
}

export function resolveModelChoice(requested?: string) {
  const catalog = getModelCatalog();
  const requestedTrimmed = requested?.trim();

  const directMatch =
    requestedTrimmed &&
    catalog.find(
      (model) =>
        model.key === requestedTrimmed ||
        model.apiModel === requestedTrimmed ||
        model.label === requestedTrimmed,
    );

  const fallback = catalog.find((model) => model.enabled) || catalog[0];
  const selected = directMatch || fallback;

  if (!selected) {
    throw new Error("No model catalog entries are configured.");
  }

  if (!selected.enabled) {
    throw new Error(
      `The selected model "${selected.label}" is unavailable because ${selected.secretEnv} is not configured.`,
    );
  }

  return selected;
}
