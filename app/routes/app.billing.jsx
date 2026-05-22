import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import {
  checkSubscription,
  createSubscription,
  SUBSCRIPTION_PLAN,
} from "../utils/billing.server";

export const loader = async ({ request }) => {
  const { admin, session, redirect } = await authenticate.admin(request);
  const subscription = await checkSubscription(admin);

  if (subscription) {
    throw redirect("/apps/discount-bundle-app-7");
  }

  return {
    shop: session.shop,
    plan: SUBSCRIPTION_PLAN,
  };
};

export const action = async ({ request }) => {
  const { admin, redirect } = await authenticate.admin(request);
  const url = new URL(request.url);

  try {
    const confirmationUrl = await createSubscription(
      admin,
      `${url.origin}/app/billing`,
    );

    if (!confirmationUrl) {
      return {
        ok: false,
        error: "Shopify did not return a billing approval link.",
      };
    }

    return redirect(confirmationUrl, { target: "_top" });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export default function BillingPage() {
  const { shop, plan } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();

  return (
    <s-page heading="Choose your plan">
      <div
        style={{
          display: "grid",
          gap: "1rem",
          maxWidth: "760px",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #111111 0%, #242424 60%, #454545 100%)",
            color: "#ffffff",
            borderRadius: "1.2rem",
            padding: "1.4rem",
            boxShadow: "0 24px 45px rgba(15, 23, 42, 0.18)",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: "0.7rem",
            }}
          >
            <div style={badgeStyle}>Subscription required</div>
            <h2 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>
              Start with {plan.trialDays} free days, then pay ${plan.amount}/month
            </h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.88)", fontSize: "0.95rem" }}>
              This plan unlocks all discount types for {shop}, including bundle,
              volume, and flat percentage discounts.
            </p>
          </div>
        </div>

        {actionData?.error ? (
          <s-banner tone="critical">
            <s-paragraph>{actionData.error}</s-paragraph>
          </s-banner>
        ) : null}

        <div
          style={{
            border: "1px solid #d9d9d9",
            borderRadius: "1rem",
            background: "#ffffff",
            padding: "1.2rem",
            display: "grid",
            gap: "1rem",
          }}
        >
          <div style={{ display: "grid", gap: "0.45rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.15rem" }}>{SUBSCRIPTION_PLAN.name}</h3>
            <p style={{ margin: 0, color: "#4a4a4a" }}>
              Approve one recurring plan in Shopify billing to keep every
              discount feature available in the app.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "0.7rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            }}
          >
            <div style={featureCardStyle}>
              <div style={featureLabelStyle}>Free trial</div>
              <div style={featureValueStyle}>{plan.trialDays} days</div>
            </div>
            <div style={featureCardStyle}>
              <div style={featureLabelStyle}>Monthly price</div>
              <div style={featureValueStyle}>${plan.amount}</div>
            </div>
            <div style={featureCardStyle}>
              <div style={featureLabelStyle}>Includes</div>
              <div style={featureValueStyle}>All discount types</div>
            </div>
          </div>

          <Form method="post">
            <s-button
              type="submit"
              variant="primary"
              loading={navigation.state === "submitting"}
            >
              Start free trial
            </s-button>
          </Form>

          <p style={{ margin: 0, fontSize: "0.84rem", color: "#666666" }}>
            Shopify will open a billing approval screen first. After approval,
            the app sends you back here and unlocks the dashboard automatically.
          </p>
        </div>
      </div>
    </s-page>
  );
}

const badgeStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "0.25rem 0.55rem",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.12)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontSize: "0.72rem",
  fontWeight: 700,
};

const featureCardStyle = {
  border: "1px solid rgba(17, 17, 17, 0.08)",
  borderRadius: "0.9rem",
  padding: "0.9rem",
  background: "#f7f7f7",
  display: "grid",
  gap: "0.35rem",
};

const featureLabelStyle = {
  fontSize: "0.8rem",
  color: "#666666",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  fontWeight: 700,
};

const featureValueStyle = {
  fontSize: "1.1rem",
  color: "#111111",
  fontWeight: 800,
};
