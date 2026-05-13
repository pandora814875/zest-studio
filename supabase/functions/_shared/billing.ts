import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type PlanTier = "free" | "pro" | "studio";

type WalletRow = {
  workspace_id: string;
  plan_tier: PlanTier;
  credits_balance: number;
  daily_claim_streak: number;
  last_daily_claim_date: string | null;
  lifetime_credits_granted: number;
  lifetime_credits_spent: number;
  created_at: string;
  updated_at: string;
};

type BillingStatus =
  | "free"
  | "pending"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

const PLAN_CATALOG = {
  free: {
    label: "Free",
    dailyCredits: 100,
    upgradeBonus: 0,
    maxProjects: 3,
    features: ["100 credits every day", "Core model access", "Up to 3 active project tokens"],
  },
  pro: {
    label: "Pro",
    dailyCredits: 260,
    upgradeBonus: 220,
    maxProjects: 12,
    features: ["Higher daily allowance", "Better for larger systems", "More project capacity"],
  },
  studio: {
    label: "Studio",
    dailyCredits: 900,
    upgradeBonus: 900,
    maxProjects: 40,
    features: ["Large team-style allowance", "Heavy model usage", "Premium workspace scale"],
  },
} satisfies Record<PlanTier, { label: string; dailyCredits: number; upgradeBonus: number; maxProjects: number; features: string[] }>;

const CREDIT_PACKS = {
  boost_25: {
    label: "Boost Pack",
    credits: 25,
    bonusCredits: 0,
    priceLabel: "$4.99",
  },
  builder_120: {
    label: "Builder Pack",
    credits: 120,
    bonusCredits: 20,
    priceLabel: "$14.99",
  },
  studio_500: {
    label: "Studio Pack",
    credits: 500,
    bonusCredits: 80,
    priceLabel: "$39.99",
  },
} as const;

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function streakBonus(planTier: PlanTier, streak: number) {
  if (streak >= 30) {
    return planTier === "studio" ? 160 : planTier === "pro" ? 80 : 30;
  }

  if (streak >= 7) {
    return planTier === "studio" ? 90 : planTier === "pro" ? 45 : 18;
  }

  if (streak >= 3) {
    return planTier === "studio" ? 40 : planTier === "pro" ? 20 : 8;
  }

  return 0;
}

export function getPlanDefinition(planTier: PlanTier) {
  return PLAN_CATALOG[planTier];
}

export function getCreditPackDefinition(packId: string) {
  return CREDIT_PACKS[packId as keyof typeof CREDIT_PACKS] || null;
}

export function getPlanCatalog() {
  return Object.entries(PLAN_CATALOG).map(([key, value]) => ({
    key,
    ...value,
  }));
}

export function getCreditPackCatalog() {
  return Object.entries(CREDIT_PACKS).map(([key, value]) => ({
    key,
    totalCredits: value.credits + value.bonusCredits,
    ...value,
  }));
}

export async function ensureWorkspaceWallet(admin: SupabaseClient, workspaceId: string) {
  const { data: existing, error: fetchError } = await admin
    .from("workspace_wallets")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing) {
    return existing as WalletRow;
  }

  const starterCredits = PLAN_CATALOG.free.dailyCredits;
  const { data: inserted, error: insertError } = await admin
    .from("workspace_wallets")
    .insert({
      workspace_id: workspaceId,
      plan_tier: "free",
      credits_balance: starterCredits,
      lifetime_credits_granted: starterCredits,
    })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  const { error: ledgerError } = await admin.from("credit_ledger").insert({
    workspace_id: workspaceId,
    delta: starterCredits,
    balance_after: starterCredits,
    kind: "starter",
    summary: "Starter credits granted",
  });

  if (ledgerError) {
    throw ledgerError;
  }

  return inserted as WalletRow;
}

export async function applyWalletDelta(
  admin: SupabaseClient,
  workspaceId: string,
  delta: number,
  kind: "starter" | "daily" | "purchase" | "spend" | "refund" | "bonus" | "plan_change",
  summary: string,
  metadata: Record<string, unknown> = {},
) {
  const { data, error } = await admin.rpc("apply_workspace_credit_delta", {
    p_workspace_id: workspaceId,
    p_delta: delta,
    p_kind: kind,
    p_summary: summary,
    p_metadata: metadata,
  });

  if (error) {
    throw error;
  }

  return data as WalletRow;
}

export async function claimDailyCredits(admin: SupabaseClient, workspaceId: string) {
  const wallet = await ensureWorkspaceWallet(admin, workspaceId);
  const today = todayUtc();

  if (wallet.last_daily_claim_date === today) {
    return wallet;
  }

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayIso = yesterday.toISOString().slice(0, 10);

  const nextStreak =
    wallet.last_daily_claim_date === yesterdayIso ? wallet.daily_claim_streak + 1 : 1;
  const cappedStreak = Math.min(nextStreak, 30);
  const plan = PLAN_CATALOG[wallet.plan_tier];
  const grant = plan.dailyCredits + streakBonus(wallet.plan_tier, cappedStreak);

  const { data: updatedWallet, error: updateError } = await admin
    .from("workspace_wallets")
    .update({
      credits_balance: wallet.credits_balance + grant,
      daily_claim_streak: cappedStreak,
      last_daily_claim_date: today,
      lifetime_credits_granted: wallet.lifetime_credits_granted + grant,
    })
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (updateError) {
    throw updateError;
  }

  const { error: ledgerError } = await admin.from("credit_ledger").insert({
    workspace_id: workspaceId,
    delta: grant,
    balance_after: updatedWallet.credits_balance,
    kind: "daily",
    summary: `${plan.label} daily credit claim`,
    metadata: {
      streak: cappedStreak,
      planTier: wallet.plan_tier,
    },
  });

  if (ledgerError) {
    throw ledgerError;
  }

  return updatedWallet as WalletRow;
}

export async function setWorkspacePlan(
  admin: SupabaseClient,
  workspaceId: string,
  planTier: PlanTier,
) {
  const wallet = await ensureWorkspaceWallet(admin, workspaceId);
  const currentPlan = wallet.plan_tier;

  if (currentPlan === planTier) {
    return wallet;
  }

  const plan = PLAN_CATALOG[planTier];
  const currentPlanBonus = PLAN_CATALOG[currentPlan].upgradeBonus;
  const bonus = Math.max(plan.upgradeBonus - currentPlanBonus, 0);

  const { data: updatedWallet, error: updateError } = await admin
    .from("workspace_wallets")
    .update({
      plan_tier: planTier,
      credits_balance: wallet.credits_balance + bonus,
      lifetime_credits_granted: wallet.lifetime_credits_granted + bonus,
    })
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (updateError) {
    throw updateError;
  }

  const { error: ledgerError } = await admin.from("credit_ledger").insert({
    workspace_id: workspaceId,
    delta: bonus,
    balance_after: updatedWallet.credits_balance,
    kind: "plan_change",
    summary: `Plan changed from ${currentPlan} to ${planTier}`,
    metadata: {
      from: currentPlan,
      to: planTier,
      upgradeBonus: bonus,
    },
  });

  if (ledgerError) {
    throw ledgerError;
  }

  return updatedWallet as WalletRow;
}

export async function purchaseCreditPack(
  admin: SupabaseClient,
  workspaceId: string,
  packId: string,
) {
  const pack = getCreditPackDefinition(packId);
  if (!pack) {
    throw new Error("Unknown credit pack.");
  }

  const totalCredits = pack.credits + pack.bonusCredits;
  return applyWalletDelta(
    admin,
    workspaceId,
    totalCredits,
    "purchase",
    `${pack.label} purchased`,
    {
      packId,
      priceLabel: pack.priceLabel,
      baseCredits: pack.credits,
      bonusCredits: pack.bonusCredits,
    },
  );
}

export async function syncWorkspaceBillingSnapshot(
  admin: SupabaseClient,
  workspaceId: string,
  patch: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripePriceId?: string | null;
    stripeCheckoutSessionId?: string | null;
    billingStatus?: BillingStatus | null;
    billingInterval?: string | null;
  },
) {
  const updates: Record<string, unknown> = {};

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
    return;
  }

  const { error } = await admin.from("workspaces").update(updates).eq("id", workspaceId);

  if (error) {
    throw error;
  }
}

export async function createBillingOrder(
  admin: SupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    kind: "plan" | "credits";
    stripeCheckoutSessionId: string;
    stripeCustomerId?: string | null;
    planTier?: PlanTier | null;
    packId?: string | null;
    amountCents?: number | null;
    currency?: string | null;
    status?: "pending" | "open" | "completed" | "failed" | "expired";
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await admin.from("billing_orders").upsert(
    {
      workspace_id: input.workspaceId,
      user_id: input.userId,
      kind: input.kind,
      stripe_checkout_session_id: input.stripeCheckoutSessionId,
      stripe_customer_id: input.stripeCustomerId || null,
      plan_tier: input.planTier || null,
      pack_id: input.packId || null,
      amount_cents: input.amountCents || null,
      currency: input.currency || "usd",
      status: input.status || "pending",
      metadata: input.metadata || {},
    },
    {
      onConflict: "stripe_checkout_session_id",
    },
  );

  if (error) {
    throw error;
  }
}

export async function updateBillingOrderStatus(
  admin: SupabaseClient,
  stripeCheckoutSessionId: string,
  patch: {
    status: "pending" | "open" | "completed" | "failed" | "expired";
    metadata?: Record<string, unknown>;
    completedAt?: string | null;
  },
) {
  const updates: Record<string, unknown> = {
    status: patch.status,
  };

  if (patch.metadata) {
    updates.metadata = patch.metadata;
  }

  if (patch.completedAt) {
    updates.completed_at = patch.completedAt;
  }

  const { error } = await admin
    .from("billing_orders")
    .update(updates)
    .eq("stripe_checkout_session_id", stripeCheckoutSessionId);

  if (error) {
    throw error;
  }
}

export async function hasProcessedStripeEvent(admin: SupabaseClient, eventId: string) {
  const { data, error } = await admin
    .from("stripe_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function markStripeEventProcessed(
  admin: SupabaseClient,
  eventId: string,
  eventType: string,
) {
  const { error } = await admin.from("stripe_events").insert({
    event_id: eventId,
    event_type: eventType,
  });

  if (error) {
    throw error;
  }
}

export async function getWorkspaceBillingState(admin: SupabaseClient, workspaceId: string) {
  const wallet = await ensureWorkspaceWallet(admin, workspaceId);

  const { data: ledger, error: ledgerError } = await admin
    .from("credit_ledger")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (ledgerError) {
    throw ledgerError;
  }

  const plan = PLAN_CATALOG[wallet.plan_tier];
  const today = todayUtc();

  return {
    wallet,
    plan: {
      key: wallet.plan_tier,
      ...plan,
    },
    canClaimDaily: wallet.last_daily_claim_date !== today,
    creditPacks: getCreditPackCatalog(),
    plans: getPlanCatalog(),
    ledger,
  };
}
