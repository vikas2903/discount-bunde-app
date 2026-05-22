import { useMemo } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { listBundleDiscounts } from "../services/bundle-discount.server";
import { toErrorMessage } from "../utils/bundle-discount";
import { useLoaderData, useNavigate } from "react-router";
import { requireSubscription } from "../utils/billing.server";

export const loader = async ({ request }) => {
  const { admin, session, redirect } = await authenticate.admin(request);
  const subscription = await requireSubscription(admin, redirect);


  try {
    const { discounts, graphqlErrors } = await listBundleDiscounts(admin);

    return {
      shop: session.shop,
      discounts,
      loadError: graphqlErrors.map(({ message }) => message).join(" | ") || null,
    };
  } catch (error) {
    return {
      shop: session.shop,
      discounts: [],
      subscription: {
        id: subscription.id,
        status: subscription.status,
        trialDays: subscription.trialDays,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      loadError: toErrorMessage(error),
    };
  }
};

export default function Index() {
  const navigate = useNavigate();
  const { shop, discounts, loadError } = useLoaderData();

  const statusSummary = useMemo(() => {
    const active = discounts.filter((discount) => discount.status === "ACTIVE").length;
    const inactive = discounts.filter((discount) => discount.status !== "ACTIVE").length;

    return {
      total: discounts.length,
      active,
      inactive,
    };
  }, [discounts]);

  return (
    <s-page heading="Dashboard">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() => navigate("/app/disocunt_bundle")}
      >
        View bundle list
      </s-button>

      <div style={{ display: "grid", gap: "0.9rem" }}>
        <div
          style={{
            background:
              "linear-gradient(135deg, #111111 0%, #1f1f1f 55%, #3b3b3b 100%)",
            borderRadius: "1.1rem",
            padding: "1rem",
            color: "#ffffff",
            boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: "0.5rem" }}>
              <div style={heroBadgeStyle}>
                Bundle dashboard
              </div>
              <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800 }}>
                Bundle discount status for {shop}
              </h2>
              <p
                style={{
                  margin: 0,
                  maxWidth: "48rem",
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "0.86rem",
                }}
              >
                Track how many bundle discounts are live right now and quickly
                review inactive campaigns from one colorful summary view.
              </p>
            </div>

            <div
              style={{
                minWidth: "125px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "0.9rem",
                padding: "0.8rem 0.9rem",
                backdropFilter: "blur(8px)",
              }}
            >
              <div style={{ fontSize: "0.76rem", color: "rgba(255,255,255,0.88)" }}>
                Active now
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1.1 }}>
                {statusSummary.active}
              </div>
            </div>
          </div>
        </div>

        {loadError ? (
          <s-banner tone="critical">
            <s-paragraph>{loadError}</s-paragraph>
          </s-banner>
        ) : null}

        <div
          style={{
            display: "grid",
            gap: "0.8rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <div style={buildStatCardStyle("#ffffff", "#111111", "#111111")}>
            <div style={statBadgeStyle}>Overview</div>
            <div style={statLabelStyle}>Total discounts</div>
            <div style={statValueStyle}>{statusSummary.total}</div>
            <div style={statHintStyle}>All bundle campaigns created for this store.</div>
          </div>

          <div style={buildStatCardStyle("#f4f4f4", "#111111", "#111111")}>
            <div style={statBadgeStyle}>Live status</div>
            <div style={statLabelStyle}>Active discounts</div>
            <div style={statValueStyle}>{statusSummary.active}</div>
            <div style={statHintStyle}>Currently running and visible to shoppers.</div>
          </div>

          <div style={buildStatCardStyle("#ebebeb", "#111111", "#111111")}>
            <div style={statBadgeStyle}>Needs attention</div>
            <div style={statLabelStyle}>Draft / inactive</div>
            <div style={statValueStyle}>{statusSummary.inactive}</div>
            <div style={statHintStyle}>Paused or not yet activated bundle discounts.</div>
          </div>
        </div>

        <div
          style={{
            padding: "0.9rem 1rem",
            border: "1px solid rgba(17,17,17,0.08)",
            borderRadius: "0.9rem",
            background: "#f7f7f7",
            color: "#222222",
            fontSize: "0.92rem",
          }}
        >
          Support communication: email us at{" "}
          <a
            href="mailto:vikasprasad2903@gmail.com"
            style={{ color: "#111111", fontWeight: 700, textDecoration: "none" }}
          >
            vikasprasad2903@gmail.com
          </a>
        </div>
      </div>
    </s-page>
  );
}

function buildStatCardStyle(background, accent, textColor) {
  return {
    background,
    border: `1px solid ${accent}22`,
    borderRadius: "1rem",
    padding: "0.95rem",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
    display: "grid",
    gap: "0.4rem",
    color: textColor,
  };
}

const heroBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "0.25rem 0.55rem",
  borderRadius: "999px",
  background: "rgba(255,255,255,0.12)",
  fontSize: "0.72rem",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const statBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  padding: "0.22rem 0.5rem",
  borderRadius: "999px",
  background: "rgba(17,17,17,0.08)",
  fontSize: "0.68rem",
  fontWeight: 700,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
};

const statLabelStyle = {
  fontSize: "0.9rem",
  fontWeight: 700,
};

const statValueStyle = {
  fontSize: "1.55rem",
  fontWeight: 800,
  lineHeight: 1.05,
};

const statHintStyle = {
  fontSize: "0.8rem",
  opacity: 0.7,
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
