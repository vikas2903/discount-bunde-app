import { Form, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import {
  BILLING_DISABLED,
  BILLING_TEST_MODE,
  SUBSCRIPTION_PLAN,
  checkSubscription,
  requestSubscription,
} from "../utils/billing.server";

const PREMIUM_FEATURES = [
  "Create and manage bundle discounts",
  "Launch volume discount offers",
  "Set up flat-off promotions",
  "Access every discount feature in one plan",
  "Use the full discount dashboard for your store",
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
  const { billing, session, redirect } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);

  if (subscription) {
    return redirect("/app");
  }

  return requestSubscription(billing, request, session.shop);
};

export default function BillingPage() {
  const navigation = useNavigation();
  const { plan, subscription, billingDisabled, billingTestMode } = useLoaderData();
  const isSubmitting = navigation.state === "submitting";
  const hasSubscription = Boolean(subscription);

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
              One subscription for all discount tools
            </h2>
            <p style={{ margin: 0, maxWidth: "48rem", color: "rgba(255,255,255,0.92)" }}>
              Install once, start with a {plan.trialDays}-day free trial, then continue at
              ${plan.amount} every {plan.intervalLabel} for all bundle, volume, and flat-off
              discount features.
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

        <div
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
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
              <div style={planTagStyle("#111111", "#f3f4f6")}>Premium plan</div>
              <div style={statusPillStyle(hasSubscription ? "#0f766e" : "#92400e")}>
                {hasSubscription ? "Active" : "14-day trial"}
              </div>
            </div>

            <div style={{ display: "grid", gap: "0.35rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.55rem", fontWeight: 800 }}>
                ${plan.amount} / {plan.intervalLabel}
              </h3>
              <p style={mutedCopyStyle}>
                This single plan unlocks every discount type in the app. Billing starts after
                the {plan.trialDays}-day free trial ends.
              </p>
            </div>

            <ul style={featureListStyle}>
              {PREMIUM_FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>

            {hasSubscription ? (
              <div style={noteBoxStyle}>
                This store already has the active premium subscription for all discount
                features.
              </div>
            ) : (
              <Form method="post" reloadDocument>
                <s-button type="submit" variant="primary" loading={isSubmitting}>
                  Activate {plan.trialDays}-day trial
                </s-button>
              </Form>
            )}

            <div style={noteBoxStyle}>
              No cancel action is shown inside this app. The subscription is intended to stay
              active while the app is installed.
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
