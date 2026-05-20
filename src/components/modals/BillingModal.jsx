import { useEffect, useState } from "react";
import { SUPABASE_ANON_KEY, SUPABASE_URL, requireSupabase } from "../../lib/supabaseClient";
import { ModalShell } from "./ModalShell";

const PLAN_OPTIONS = [
  {
    tier: "pro",
    eyebrow: "Pro plan",
    price: "$19.99",
    cadence: "/month",
    highlight: "Best for daily builders who want more speed and room.",
    features: [
      "Faster generation",
      "More workspace headroom",
      "Better long-task support",
      "Priority billing support",
    ],
  },
  {
    tier: "studio",
    eyebrow: "Studio plan",
    price: "$49.99",
    cadence: "/month",
    highlight: "For heavier Roblox pipelines, team workflows, and bigger systems.",
    features: [
      "Highest workspace scale",
      "Studio-grade generation limits",
      "Best priority for larger jobs",
      "Support for bigger production loops",
    ],
  },
];

async function parseCheckoutResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Unable to start checkout.");
  }

  return data;
}

export function BillingModal({ open, onClose, workspace }) {
  const [error, setError] = useState("");
  const [loadingTier, setLoadingTier] = useState("");

  useEffect(() => {
    if (!open) {
      setError("");
      setLoadingTier("");
    }
  }, [open]);

  async function handleUpgrade(planTier) {
    try {
      const client = requireSupabase();
      const {
        data: { session },
        error: sessionError,
      } = await client.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error("Sign in with Roblox before opening checkout.");
      }

      if (!workspace?.workspaceToken || workspace.persisted === false) {
        throw new Error("Create a saved workspace before upgrading your plan.");
      }

      setError("");
      setLoadingTier(planTier);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          kind: "plan",
          planTier,
          workspaceToken: workspace.workspaceToken,
          origin: window.location.origin,
        }),
      });

      const data = await parseCheckoutResponse(response);

      if (!data.url) {
        throw new Error("Stripe checkout did not return a URL.");
      }

      window.location.href = data.url;
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to start checkout.");
      setLoadingTier("");
    }
  }

  return (
    <ModalShell open={open} onClose={onClose} className="billing-modal-card">
      <div className="billing-modal-shell">
        <div className="dialog-head billing-modal-head">
          <div>
            <span className="sidebar-label">Billing</span>
            <h2>Upgrade {workspace?.name || "this workspace"}</h2>
            <p className="drawer-copy">
              Pick a paid plan, then jump into the Stripe checkout flow for this workspace.
            </p>
          </div>
          <button className="drawer-close-button" type="button" onClick={onClose}>
            ×
          </button>
        </div>

        {error ? <div className="notice notice-error">{error}</div> : null}

        <div className="billing-plan-grid">
          {PLAN_OPTIONS.map((plan) => (
            <div className="billing-plan-card" key={plan.tier}>
              <div className="billing-plan-copy">
                <span className="billing-plan-eyebrow">{plan.eyebrow}</span>
                <div className="billing-plan-price-row">
                  <strong>{plan.price}</strong>
                  <span>{plan.cadence}</span>
                </div>
                <p>{plan.highlight}</p>
              </div>

              <div className="billing-plan-features">
                {plan.features.map((feature) => (
                  <div className="billing-plan-feature" key={feature}>
                    <span className="billing-plan-dot" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                className="primary-button billing-plan-button"
                type="button"
                onClick={() => handleUpgrade(plan.tier)}
                disabled={loadingTier === plan.tier}
              >
                {loadingTier === plan.tier ? "Redirecting..." : `Upgrade to ${plan.eyebrow.replace(" plan", "")}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}
