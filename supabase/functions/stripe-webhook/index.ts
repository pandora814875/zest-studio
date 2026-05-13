import Stripe from "npm:stripe@18";
import {
  hasProcessedStripeEvent,
  markStripeEventProcessed,
  purchaseCreditPack,
  setWorkspacePlan,
  syncWorkspaceBillingSnapshot,
  updateBillingOrderStatus,
  type PlanTier,
} from "../_shared/billing.ts";
import { createStripeClient, planTierFromPriceId } from "../_shared/stripe.ts";
import { createAdminClient, getWorkspaceById, type WorkspaceRow } from "../_shared/workspace.ts";

function webhookSecret() {
  const value = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!value) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
  }

  return value;
}

function normalizeSubscriptionStatus(status: Stripe.Subscription.Status) {
  if (status === "active") {
    return "active";
  }

  if (status === "trialing") {
    return "trialing";
  }

  if (status === "past_due") {
    return "past_due";
  }

  if (status === "canceled") {
    return "canceled";
  }

  if (status === "unpaid") {
    return "unpaid";
  }

  return "pending";
}

async function workspaceBySubscriptionId(
  admin: ReturnType<typeof createAdminClient>,
  subscriptionId: string,
) {
  const { data, error } = await admin
    .from("workspaces")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as WorkspaceRow | null;
}

async function resolveWorkspaceForSubscription(
  admin: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
) {
  const metadataWorkspaceId = subscription.metadata?.workspaceId;
  if (metadataWorkspaceId) {
    return getWorkspaceById(admin, metadataWorkspaceId);
  }

  return workspaceBySubscriptionId(admin, subscription.id);
}

Deno.serve(async (request) => {
  try {
    const stripe = createStripeClient();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("Missing Stripe signature.");
    }

    const body = await request.text();
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret());
    const admin = createAdminClient();

    if (await hasProcessedStripeEvent(admin, event.id)) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId;

      if (workspaceId) {
        const workspace = await getWorkspaceById(admin, workspaceId);
        const purchaseKind = session.metadata?.purchaseKind;

        if (purchaseKind === "credits" && session.payment_status === "paid") {
          const packId = session.metadata?.packId || "";
          await purchaseCreditPack(admin, workspace.id, packId);
          await syncWorkspaceBillingSnapshot(admin, workspace.id, {
            stripeCustomerId:
              typeof session.customer === "string" ? session.customer : workspace.stripe_customer_id || null,
            stripeCheckoutSessionId: session.id,
          });
          await updateBillingOrderStatus(admin, session.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
            metadata: {
              purchaseKind,
              workspaceId,
              paymentStatus: session.payment_status,
            },
          });
        }

        if (purchaseKind === "plan") {
          const planTier = (session.metadata?.planTier || "free") as PlanTier;
          await setWorkspacePlan(admin, workspace.id, planTier);
          await syncWorkspaceBillingSnapshot(admin, workspace.id, {
            stripeCustomerId:
              typeof session.customer === "string" ? session.customer : workspace.stripe_customer_id || null,
            stripeSubscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : workspace.stripe_subscription_id || null,
            stripeCheckoutSessionId: session.id,
            billingStatus: "active",
          });
          await updateBillingOrderStatus(admin, session.id, {
            status: "completed",
            completedAt: new Date().toISOString(),
            metadata: {
              purchaseKind,
              workspaceId,
              paymentStatus: session.payment_status,
              planTier,
            },
          });
        }
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      await updateBillingOrderStatus(admin, session.id, {
        status: "expired",
        metadata: {
          purchaseKind: session.metadata?.purchaseKind || "",
          workspaceId: session.metadata?.workspaceId || "",
        },
      });
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const workspace = await resolveWorkspaceForSubscription(admin, subscription);

      if (workspace) {
        const primaryPrice = subscription.items.data[0]?.price;
        const resolvedPlan =
          (subscription.metadata?.planTier as PlanTier | undefined) ||
          planTierFromPriceId(primaryPrice?.id) ||
          "free";
        const billingStatus = normalizeSubscriptionStatus(subscription.status);
        const billingInterval = primaryPrice?.recurring?.interval || null;

        if (["active", "trialing", "past_due"].includes(billingStatus)) {
          await setWorkspacePlan(admin, workspace.id, resolvedPlan);
          await syncWorkspaceBillingSnapshot(admin, workspace.id, {
            stripeCustomerId:
              typeof subscription.customer === "string"
                ? subscription.customer
                : workspace.stripe_customer_id || null,
            stripeSubscriptionId: subscription.id,
            stripePriceId: primaryPrice?.id || null,
            billingStatus,
            billingInterval,
          });
        } else {
          await setWorkspacePlan(admin, workspace.id, "free");
          await syncWorkspaceBillingSnapshot(admin, workspace.id, {
            stripeCustomerId:
              typeof subscription.customer === "string"
                ? subscription.customer
                : workspace.stripe_customer_id || null,
            stripeSubscriptionId: null,
            stripePriceId: null,
            billingStatus,
            billingInterval: null,
          });
        }
      }
    }

    await markStripeEventProcessed(admin, event.id, event.type);

    return new Response(JSON.stringify({ ok: true }), {
      headers: {
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
          "Content-Type": "application/json",
        },
      },
    );
  }
});
