import { corsHeaders } from "../_shared/cors.ts";
import { checkoutUrls, createStripeClient } from "../_shared/stripe.ts";
import {
  createAdminClient,
  requireOwnedWorkspace,
  requireString,
  requireUser,
} from "../_shared/workspace.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const admin = createAdminClient();
    const user = await requireUser(request);
    const body = await request.json();
    const origin = requireString(body.origin, "origin is required.");
    const workspaceToken = requireString(body.workspaceToken, "workspaceToken is required.");
    const workspace = await requireOwnedWorkspace(admin, user.id, workspaceToken);

    if (!workspace.stripe_customer_id) {
      throw new Error("This workspace does not have a Stripe customer yet.");
    }

    const stripe = createStripeClient();
    const portal = await stripe.billingPortal.sessions.create({
      customer: workspace.stripe_customer_id,
      return_url: checkoutUrls(origin).portalReturnUrl,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        url: portal.url,
      }),
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
