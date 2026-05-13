import { corsHeaders } from "../_shared/cors.ts";
import {
  createBillingOrder,
  getCreditPackDefinition,
  getPlanDefinition,
  type PlanTier,
} from "../_shared/billing.ts";
import { checkoutUrls, createStripeClient, getPackStripePrice, getPlanStripePrice } from "../_shared/stripe.ts";
import {
  createAdminClient,
  requireOwnedWorkspace,
  requireString,
  requireUser,
  updateOwnedWorkspace,
} from "../_shared/workspace.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const user = await requireUser(request);
    const body = await request.json();
    const kind = requireString(body.kind, "kind is required.");
    const origin = requireString(body.origin, "origin is required.");
    const workspaceToken = requireString(body.workspaceToken, "workspaceToken is required.");
    const workspace = await requireOwnedWorkspace(admin, user.id, workspaceToken);
    const stripe = createStripeClient();
    const urls = checkoutUrls(origin);

    let customerId = workspace.stripe_customer_id || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: workspace.display_name,
        metadata: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      });

      customerId = customer.id;
    }

    if (kind === "plan") {
      const planTier = requireString(body.planTier, "planTier is required.") as PlanTier;
      if (!["pro", "studio"].includes(planTier)) {
        throw new Error("Paid checkout only supports the pro or studio plan.");
      }

      const priceId = getPlanStripePrice(planTier);
      const plan = getPlanDefinition(planTier);
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        allow_promotion_codes: true,
        success_url: urls.successUrl,
        cancel_url: urls.cancelUrl,
        client_reference_id: workspace.id,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          workspaceId: workspace.id,
          userId: user.id,
          purchaseKind: "plan",
          planTier,
        },
        subscription_data: {
          metadata: {
            workspaceId: workspace.id,
            userId: user.id,
            planTier,
          },
        },
      });

      await updateOwnedWorkspace(admin, user.id, workspaceToken, {
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: session.id,
        stripePriceId: priceId,
        billingStatus: "pending",
      });

      await createBillingOrder(admin, {
        workspaceId: workspace.id,
        userId: user.id,
        kind: "plan",
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: customerId,
        planTier,
        amountCents: session.amount_total || null,
        currency: session.currency || "usd",
        status: "open",
        metadata: {
          planLabel: plan.label,
          priceId,
        },
      });

      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      return new Response(
        JSON.stringify({
          ok: true,
          url: session.url,
          sessionId: session.id,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (kind === "credits") {
      const packId = requireString(body.packId, "packId is required.");
      const priceId = getPackStripePrice(packId);
      const pack = getCreditPackDefinition(packId);

      if (!pack) {
        throw new Error("Unknown credit pack.");
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: customerId,
        allow_promotion_codes: true,
        success_url: urls.successUrl,
        cancel_url: urls.cancelUrl,
        client_reference_id: workspace.id,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        metadata: {
          workspaceId: workspace.id,
          userId: user.id,
          purchaseKind: "credits",
          packId,
        },
      });

      await updateOwnedWorkspace(admin, user.id, workspaceToken, {
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: session.id,
      });

      await createBillingOrder(admin, {
        workspaceId: workspace.id,
        userId: user.id,
        kind: "credits",
        stripeCheckoutSessionId: session.id,
        stripeCustomerId: customerId,
        packId,
        amountCents: session.amount_total || null,
        currency: session.currency || "usd",
        status: "open",
        metadata: {
          packLabel: pack.label,
          priceId,
        },
      });

      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      return new Response(
        JSON.stringify({
          ok: true,
          url: session.url,
          sessionId: session.id,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    throw new Error("Unsupported checkout kind.");
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
