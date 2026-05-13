import Stripe from "npm:stripe@18";
import type { PlanTier } from "./billing.ts";

function requireEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export function createStripeClient() {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function checkoutUrls(origin: string) {
  const trimmedOrigin = origin.replace(/\/+$/, "");

  return {
    successUrl:
      Deno.env.get("STRIPE_SUCCESS_URL") ||
      `${trimmedOrigin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: Deno.env.get("STRIPE_CANCEL_URL") || `${trimmedOrigin}/?checkout=cancelled`,
    portalReturnUrl: Deno.env.get("STRIPE_PORTAL_RETURN_URL") || `${trimmedOrigin}/`,
  };
}

export function getPlanStripePrice(planTier: PlanTier) {
  const mapping: Record<Exclude<PlanTier, "free">, string> = {
    pro: "STRIPE_PRICE_PRO_MONTHLY",
    studio: "STRIPE_PRICE_STUDIO_MONTHLY",
  };

  if (planTier === "free") {
    return null;
  }

  return requireEnv(mapping[planTier]);
}

export function planTierFromPriceId(priceId: string | null | undefined) {
  if (!priceId) {
    return null;
  }

  const pairs: Array<[Exclude<PlanTier, "free">, string | undefined]> = [
    ["pro", Deno.env.get("STRIPE_PRICE_PRO_MONTHLY")],
    ["studio", Deno.env.get("STRIPE_PRICE_STUDIO_MONTHLY")],
  ];

  const match = pairs.find(([, configuredPriceId]) => configuredPriceId === priceId);
  return match ? match[0] : null;
}

export function getPackStripePrice(packId: string) {
  const mapping: Record<string, string> = {
    boost_25: "STRIPE_PRICE_PACK_BOOST_25",
    builder_120: "STRIPE_PRICE_PACK_BUILDER_120",
    studio_500: "STRIPE_PRICE_PACK_STUDIO_500",
  };

  const envName = mapping[packId];
  if (!envName) {
    throw new Error("Unknown credit pack.");
  }

  return requireEnv(envName);
}
