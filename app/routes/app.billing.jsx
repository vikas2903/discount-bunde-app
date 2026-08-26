import { useState } from "react";
import { useLoaderData } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import {
  BILLING_DISABLED,
  BILLING_TEST_MODE,
  DASHBOARD_HOME_PATH,
  SUBSCRIPTION_PLAN,
  checkSubscription,
  requestSubscription,
} from "../utils/billing.server";

const FREE_FEATURES = [
  "One active quantity / volume discount",
  "Percentage-based quantity tiers",
  "Collection targeting",
  "One product-page quantity-offer template",
  "Offer scheduling, editing, and basic in-app support",
];

const PRO_FEATURES = [
  "Unlimited active quantity / volume discounts",
  "All discount types: quantity tiers, fixed-price bundles, percentage bundles, and simple percentage sales",
  "Bundle template 1: mix-and-match collection bundle page",
  "Bundle template 2: alternative collection bundle page",
  "Volume discount template: buy-more-save-more product-page offer",
  "Storefront setup and theme-editor installation links",
  "Collection targeting, offer scheduling, and editing",
  "GoKwik and Shiprocket checkout snippets",
  "Priority Pro in-app support",
];

export const loader = async ({ request }) => {
  const { billing } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);

  return {
    plan: SUBSCRIPTION_PLAN,
    subscription,
    billingDisabled: BILLING_DISABLED,
    billingTestMode: BILLING_TEST_MODE,
  };
};

export const action = async ({ request }) => {
  const { billing, redirect, session } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);

  if (subscription) {
    return redirect(DASHBOARD_HOME_PATH);
  }

  try {
    await requestSubscription(billing, session);
  } catch (responseOrError) {
    // The billing helper returns the hosted Shopify approval URL as a 401
    // response for authenticated XHR requests. Give the URL to the browser so
    // the client can explicitly navigate Shopify Admin's top-level window.
    if (responseOrError instanceof Response) {
      const confirmationUrl = responseOrError.headers.get(
        "X-Shopify-API-Request-Failure-Reauthorize-Url",
      );

      if (confirmationUrl) {
        return Response.json({ confirmationUrl });
      }
    }

    console.error("[billing] Unable to create subscription", responseOrError);
    return Response.json(
      { error: getBillingErrorMessage(responseOrError) },
      { status: 500 },
    );
  }
};

function getBillingErrorMessage(error) {
  const details = Array.isArray(error?.errorData)
    ? error.errorData
        .map((entry) => (typeof entry?.message === "string" ? entry.message : ""))
        .filter(Boolean)
    : [];

  return details.join(" ") || "Shopify could not create the subscription. Check the Railway logs for details.";
}

export default function BillingPage() {
  const shopify = useAppBridge();
  const { plan, subscription, billingDisabled, billingTestMode } = useLoaderData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [billingError, setBillingError] = useState("");
  const hasSubscription = Boolean(subscription);

  async function startSubscription() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setBillingError("");

    // Open the approval tab synchronously with the merchant's click. Shopify
    // confirmation URLs cannot be displayed inside the Admin iframe, and a
    // tab opened only after an async request is commonly blocked in previews.
    const approvalWindow = window.open("about:blank", "_blank");

    if (approvalWindow) {
      approvalWindow.document.title = "Opening Shopify billing approval";
      approvalWindow.document.body.innerHTML =
        '<p style="font-family:system-ui;padding:2rem">Opening Shopify billing approval…</p>';
    }

    try {
      // Explicitly request the ID token so this also works in development
      // previews where fetch interception can be unavailable during startup.
      const token = await shopify.idToken();
      const response = await fetch("/app/billing", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = response.headers.get("content-type")?.includes("application/json")
        ? await response.json()
        : null;

      if (payload?.confirmationUrl) {
        if (!approvalWindow) {
          throw new Error(
            "Your browser blocked Shopify's approval tab. Allow pop-ups for Shopify Admin, then try again.",
          );
        }

        approvalWindow.location.replace(payload.confirmationUrl);
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload?.error || "Shopify could not start the subscription. Please try again.",
        );
      }
    } catch (error) {
      if (approvalWindow && !approvalWindow.closed) {
        approvalWindow.close();
      }
      setBillingError(
        error instanceof Error
          ? error.message
          : "Shopify could not start the subscription. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <s-page heading="Plans & billing">
      <div style={{ display: "grid", gap: "1rem" }}>
        <div
          style={{
            background: "linear-gradient(135deg, #111111 0%, #1d3b2f 55%, #6fcb8f 100%)",
            borderRadius: "1.2rem",
            padding: "1.1rem",
            color: "#ffffff",
            boxShadow: "0 18px 40px rgba(17, 24, 39, 0.18)",
          }}
        >
          <div style={{ display: "grid", gap: "0.55rem" }}>
            <div style={heroBadgeStyle}>Billing overview</div>
            <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800 }}>
              Choose the plan that fits your store
            </h2>
            <p style={{ margin: 0, maxWidth: "48rem", color: "rgba(255,255,255,0.92)" }}>
              Start on Free, or approve Pro to begin a {plan.trialDays}-day free trial. Shopify automatically starts the ${plan.amount} monthly Pro subscription after the trial unless the merchant cancels it in Shopify Admin.
            </p>
          </div>
        </div>

        {hasSubscription ? (
          <s-banner tone="success">
            <s-paragraph>
              Your app subscription is active{subscription.status ? ` (${subscription.status})` : ""}.
            </s-paragraph>
          </s-banner>
        ) : null}

        {billingDisabled ? (
          <s-banner tone="info">
            <s-paragraph>
              Billing is currently bypassed in this environment, so plan approvals are not required.
            </s-paragraph>
          </s-banner>
        ) : null}

        {billingError ? (
          <s-banner tone="critical">
            <s-paragraph>{billingError}</s-paragraph>
          </s-banner>
        ) : null}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1rem",
            alignItems: "start",
          }}
        >
          <section style={buildPlanCardStyle("#f8fafc", "#d1d5db")}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <div style={planTagStyle("#334155", "#e2e8f0")}>Free</div>
              <div style={statusPillStyle(hasSubscription ? "#64748b" : "#0f766e")}>
                {hasSubscription ? "Available" : "Current plan"}
              </div>
            </div>
            <div style={{ display: "grid", gap: "0.35rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>$0 / month</h3>
              <p style={mutedCopyStyle}>A simple plan for one buy-more-save-more offer. No card or trial approval is required.</p>
            </div>
            <ul style={featureListStyle}>{FREE_FEATURES.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            {!hasSubscription ? <div style={noteBoxStyle}>Your store is currently on Free.</div> : null}
          </section>

          <section style={buildPlanCardStyle("#ffffff", "#111111")}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div style={planTagStyle("#111111", "#f3f4f6")}>Pro plan</div>
              <div style={statusPillStyle(hasSubscription ? "#0f766e" : "#92400e")}>
                {hasSubscription ? "Active" : "14-day trial"}
              </div>
            </div>

            <div style={{ display: "grid", gap: "0.35rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.55rem", fontWeight: 800 }}>
                ${plan.amount} / {plan.intervalLabel}
              </h3>
              <p style={mutedCopyStyle}>
                Unlock every discount type and all three storefront templates free for {plan.trialDays} days. Shopify then bills ${plan.amount} every {plan.intervalLabel}.
              </p>
            </div>

            <ul style={featureListStyle}>
              {PRO_FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            {hasSubscription ? (
              <div style={noteBoxStyle}>
                Pro is active for this store. Manage or cancel this subscription in Shopify Admin → Settings → Billing.
              </div>
            ) : (
              <s-button
                type="button"
                variant="primary"
                loading={isSubmitting}
                onClick={startSubscription}
              >
                Start {plan.trialDays}-day Pro trial
              </s-button>
            )}

            <div style={noteBoxStyle}>
              Cancel anytime in Shopify Admin → Settings → Billing. Cancelling returns future use to the Free plan when the paid period ends.
            </div>

            {billingTestMode ? (
              <p style={footnoteStyle}>Billing requests are running in Shopify test mode.</p>
            ) : null}
          </section>
        </div>
      </div>
    </s-page>
  );
}

function buildPlanCardStyle(background, borderColor) {
  return {
    background,
    border: `1px solid ${borderColor}`,
    borderRadius: "1rem",
    padding: "1rem",
    display: "grid",
    gap: "0.9rem",
    boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
  };
}

const heroBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "0.25rem 0.55rem",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.14)",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const planTagStyle = (color, background) => ({
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  alignSelf: "start",
  padding: "0.28rem 0.6rem",
  borderRadius: "999px",
  color,
  background,
  fontSize: "0.72rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

const mutedCopyStyle = {
  margin: 0,
  color: "#4b5563",
  fontSize: "0.92rem",
};

const featureListStyle = {
  margin: 0,
  paddingLeft: "1.1rem",
  display: "grid",
  gap: "0.45rem",
  color: "#111827",
};

const noteBoxStyle = {
  padding: "0.8rem 0.9rem",
  borderRadius: "0.85rem",
  background: "#f3f4f6",
  color: "#1f2937",
  fontSize: "0.9rem",
};

const statusPillStyle = (color) => ({
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "0.3rem 0.7rem",
  borderRadius: "999px",
  background: `${color}16`,
  color,
  fontSize: "0.78rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

const footnoteStyle = {
  margin: 0,
  fontSize: "0.78rem",
  color: "#6b7280",
};
