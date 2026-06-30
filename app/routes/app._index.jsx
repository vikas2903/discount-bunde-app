import { useMemo } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { listBundleDiscounts } from "../services/bundle-discount.server";
import { toErrorMessage } from "../utils/bundle-discount";
import { requireSubscription } from "../utils/billing.server";

const YOUTUBE_GUIDE_URL = "";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  await requireSubscription(billing, request, session.shop);

  try {
    const { discounts, graphqlErrors } = await listBundleDiscounts(admin);

    return {
      shop: session.shop,
      discounts,
      loadError: graphqlErrors.map(({ message }) => message).join(" | ") || null,
      youtubeGuideUrl: YOUTUBE_GUIDE_URL,
    };
  } catch (error) {
    return {
      shop: session.shop,
      discounts: [],
      loadError: toErrorMessage(error),
      youtubeGuideUrl: YOUTUBE_GUIDE_URL,
    };
  }
};

export default function AppIndex() {
  const navigate = useNavigate();
  const { shop, discounts, loadError, youtubeGuideUrl } = useLoaderData();
  const summary = useMemo(() => {
    const active = discounts.filter((discount) => discount.status === "ACTIVE").length;

    return {
      total: discounts.length,
      active,
      inactive: discounts.length - active,
    };
  }, [discounts]);
  const embedUrl = toYoutubeEmbedUrl(youtubeGuideUrl);

  return (
    <s-page heading="Discount dashboard">
      <div style={pageStyle}>
        <section style={welcomeCardStyle}>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <div style={eyebrowStyle}>Welcome</div>
            <h2 style={headingStyle}>Create discounts in 3 simple steps</h2>
            <p style={copyStyle}>
              Choose a discount type, set your offer, and activate it for {shop}.
            </p>
          </div>

          <div style={statGridStyle}>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Total discounts</div>
              <div style={statValueStyle}>{summary.total}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Active</div>
              <div style={statValueStyle}>{summary.active}</div>
            </div>
            <div style={statCardStyle}>
              <div style={statLabelStyle}>Inactive</div>
              <div style={statValueStyle}>{summary.inactive}</div>
            </div>
          </div>
        </section>

        {loadError ? (
          <s-banner tone="critical">
            <s-paragraph>{loadError}</s-paragraph>
          </s-banner>
        ) : null}

        <section style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Start here</div>
              <h3 style={sectionTitleStyle}>Choose what you want to create</h3>
            </div>
          </div>

          <div style={actionGridStyle}>
            <button
              type="button"
              style={primaryCardStyle}
              onClick={() => navigate("/app/disocunt_bundle/new")}
            >
              <div style={cardTitleStyle}>Bundle discount</div>
              <div style={cardCopyStyle}>
                Create mix-and-match bundle offers with fixed pricing.
              </div>
            </button>

            <button
              type="button"
              style={secondaryCardStyle}
              onClick={() => navigate("/app/volume_discounts")}
            >
              <div style={cardTitleStyle}>Volume discount</div>
              <div style={cardCopyStyle}>
                Create quantity tiers like 2 items = 5% off, 3 items = 15% off.
              </div>
            </button>

            <button
              type="button"
              style={secondaryCardStyle}
              onClick={() => navigate("/app/flatoff_disocunt")}
            >
              <div style={cardTitleStyle}>Flat-off discount</div>
              <div style={cardCopyStyle}>
                Create a simple percentage discount for eligible products.
              </div>
            </button>
          </div>
        </section>

        <section style={twoColumnGridStyle}>
          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <div style={eyebrowStyle}>How to use</div>
                <h3 style={sectionTitleStyle}>Simple merchant flow</h3>
              </div>
            </div>

            <div style={stepsWrapStyle}>
              <div style={stepRowStyle}>
                <div style={stepNumberStyle}>1</div>
                <div>
                  <div style={stepTitleStyle}>Open a discount type</div>
                  <div style={stepCopyStyle}>
                    Choose Bundle, Volume, or Flat-off from the buttons above.
                  </div>
                </div>
              </div>

              <div style={stepRowStyle}>
                <div style={stepNumberStyle}>2</div>
                <div>
                  <div style={stepTitleStyle}>Set your offer</div>
                  <div style={stepCopyStyle}>
                    Add quantity, price, or percentage based on your campaign requirement.
                  </div>
                </div>
              </div>

              <div style={stepRowStyle}>
                <div style={stepNumberStyle}>3</div>
                <div>
                  <div style={stepTitleStyle}>Activate the discount</div>
                  <div style={stepCopyStyle}>
                    Save it, review it in the dashboard, then activate when ready.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={sectionCardStyle}>
            <div style={sectionHeaderStyle}>
              <div>
                <div style={eyebrowStyle}>Video guide</div>
                <h3 style={sectionTitleStyle}>Help merchants with YouTube</h3>
              </div>
            </div>

            {embedUrl ? (
              <div style={videoWrapStyle}>
                <iframe
                  title="How to use this app"
                  src={embedUrl}
                  style={iframeStyle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div style={videoPlaceholderStyle}>
                <div style={stepTitleStyle}>No video added yet</div>
                <div style={stepCopyStyle}>
                  Add your YouTube link in [app._index.jsx](C:/Users/dell/Desktop/discount-bundle/discount-bundle-app/app/routes/app._index.jsx:8)
                  by updating `YOUTUBE_GUIDE_URL`.
                </div>
                <div style={codeStyle}>
                  Example: `https://www.youtube.com/watch?v=YOUR_VIDEO_ID`
                </div>
              </div>
            )}
          </div>
        </section>

        <section style={sectionCardStyle}>
          <div style={sectionHeaderStyle}>
            <div>
              <div style={eyebrowStyle}>Manage</div>
              <h3 style={sectionTitleStyle}>Quick links</h3>
            </div>
          </div>

          <div style={quickLinkRowStyle}>
            <button
              type="button"
              style={smallButtonStyle}
              onClick={() => navigate("/app/disocunt_bundle")}
            >
              View bundle discounts
            </button>
            <button
              type="button"
              style={smallButtonStyle}
              onClick={() => navigate("/app/volume_discounts")}
            >
              View volume discounts
            </button>
            <button
              type="button"
              style={smallButtonStyle}
              onClick={() => navigate("/app/billing")}
            >
              Plan and billing
            </button>
          </div>
        </section>
      </div>
    </s-page>
  );
}

function toYoutubeEmbedUrl(url) {
  if (!url || typeof url !== "string") {
    return "";
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch?.[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }

  const shortMatch = trimmed.match(/youtu\.be\/([^?&/]+)/);
  if (shortMatch?.[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }

  const embedMatch = trimmed.match(/youtube\.com\/embed\/([^?&/]+)/);
  if (embedMatch?.[1]) {
    return trimmed;
  }

  return "";
}

const pageStyle = {
  display: "grid",
  gap: "1rem",
};

const welcomeCardStyle = {
  display: "grid",
  gap: "1rem",
  background: "#ffffff",
  border: "1px solid #dde3ea",
  borderRadius: "1rem",
  padding: "1.1rem",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.05)",
};

const sectionCardStyle = {
  display: "grid",
  gap: "1rem",
  background: "#ffffff",
  border: "1px solid #dde3ea",
  borderRadius: "1rem",
  padding: "1.1rem",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.05)",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "1rem",
};

const eyebrowStyle = {
  fontSize: "0.72rem",
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#2563eb",
  marginBottom: "0.2rem",
};

const headingStyle = {
  margin: 0,
  fontSize: "1.5rem",
  fontWeight: 800,
  color: "#111827",
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: "1.05rem",
  fontWeight: 800,
  color: "#111827",
};

const copyStyle = {
  margin: 0,
  fontSize: "0.92rem",
  lineHeight: 1.6,
  color: "#4b5563",
};

const statGridStyle = {
  display: "grid",
  gap: "0.8rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
};

const statCardStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: "0.9rem",
  padding: "0.85rem",
  background: "#f8fbff",
  display: "grid",
  gap: "0.3rem",
};

const statLabelStyle = {
  fontSize: "0.8rem",
  color: "#6b7280",
  fontWeight: 700,
};

const statValueStyle = {
  fontSize: "1.45rem",
  fontWeight: 800,
  color: "#111827",
};

const actionGridStyle = {
  display: "grid",
  gap: "0.8rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};

const baseCardStyle = {
  textAlign: "left",
  borderRadius: "0.95rem",
  padding: "1rem",
  display: "grid",
  gap: "0.38rem",
  cursor: "pointer",
};

const primaryCardStyle = {
  ...baseCardStyle,
  border: "1px solid #cfe0ff",
  background: "#eaf2ff",
};

const secondaryCardStyle = {
  ...baseCardStyle,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
};

const cardTitleStyle = {
  fontSize: "0.98rem",
  fontWeight: 800,
  color: "#111827",
};

const cardCopyStyle = {
  fontSize: "0.84rem",
  lineHeight: 1.55,
  color: "#4b5563",
};

const twoColumnGridStyle = {
  display: "grid",
  gap: "1rem",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
};

const stepsWrapStyle = {
  display: "grid",
  gap: "0.9rem",
};

const stepRowStyle = {
  display: "grid",
  gridTemplateColumns: "42px minmax(0, 1fr)",
  gap: "0.8rem",
  alignItems: "start",
};

const stepNumberStyle = {
  width: "42px",
  height: "42px",
  borderRadius: "999px",
  background: "#eaf2ff",
  color: "#1d4ed8",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
};

const stepTitleStyle = {
  fontSize: "0.95rem",
  fontWeight: 800,
  color: "#111827",
};

const stepCopyStyle = {
  marginTop: "0.2rem",
  fontSize: "0.84rem",
  lineHeight: 1.55,
  color: "#4b5563",
};

const videoWrapStyle = {
  borderRadius: "0.95rem",
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  background: "#000000",
};

const iframeStyle = {
  width: "100%",
  minHeight: "280px",
  border: 0,
  display: "block",
};

const videoPlaceholderStyle = {
  border: "1px dashed #cbd5e1",
  borderRadius: "0.95rem",
  padding: "1rem",
  background: "#f8fbff",
  display: "grid",
  gap: "0.55rem",
};

const codeStyle = {
  fontSize: "0.82rem",
  fontFamily: "monospace",
  color: "#1e3a8a",
  background: "#eff6ff",
  borderRadius: "0.6rem",
  padding: "0.7rem 0.8rem",
};

const quickLinkRowStyle = {
  display: "flex",
  gap: "0.75rem",
  flexWrap: "wrap",
};

const smallButtonStyle = {
  border: "1px solid #d1d5db",
  background: "#ffffff",
  borderRadius: "0.75rem",
  padding: "0.75rem 0.95rem",
  fontWeight: 700,
  cursor: "pointer",
};

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
