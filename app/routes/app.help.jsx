/* global process */
import { useLoaderData, useLocation } from "react-router";
import { authenticate } from "../shopify.server";
import { checkSubscription, getPlanDetails } from "../utils/billing.server";

const DEFAULT_SUPPORT_EMAIL = "vikasprasad2903@gmail.com";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);

  return {
    plan: getPlanDetails(subscription),
    shop: session?.shop || "",
    supportEmail: process.env.SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL,
  };
};

export default function HelpPage() {
  const { plan, shop, supportEmail } = useLoaderData();
  const { search } = useLocation();
  const volumeDiscountsHref = buildEmbeddedHref("/app/volume_discounts", search, shop);
  const bundleOffersHref = buildEmbeddedHref(
    plan.isPro ? "/app/disocunt_bundle" : "/app/billing",
    search,
    shop,
  );
  const storefrontSetupHref = buildEmbeddedHref("/app/storefront_setup", search, shop);
  const billingHref = buildEmbeddedHref("/app/billing", search, shop);

  return (
    <s-page heading="Help & support">
      <div style={pageStyle}>
        <section style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>Need a hand?</div>
            <h2 style={heroTitleStyle}>We’ll help you get your offer live.</h2>
            <p style={heroCopyStyle}>Email us with your store URL, the offer name, and a screenshot of the issue.</p>
          </div>
          <div style={supportContactStyle}>
            <a href={`mailto:${supportEmail}`} style={emailButtonStyle}>Email support</a>
            <a href={`mailto:${supportEmail}`} style={emailAddressStyle}>{supportEmail}</a>
          </div>
        </section>

        <section style={cardStyle}>
          <div><div style={eyebrowStyle}>Start here</div><h2 style={titleStyle}>Create your first offer</h2></div>
          <div style={stepsGridStyle}>
            <Step number="1" title="Choose an offer" copy="Use Quantity offers for buy-more-save-more. Use Bundle offers for fixed-price bundles." />
            <Step number="2" title="Save and activate" copy="Select your products or collection, add the saving, then make the offer active." />
            <Step number="3" title="Test it" copy="Add qualifying products to your cart and confirm the discount appears before sharing it." />
          </div>
          <div style={linkRowStyle}>
            <s-link href={volumeDiscountsHref}>Open Quantity offers</s-link>
            <s-link href={bundleOffersHref}>{plan.isPro ? "Open Bundle offers" : "Upgrade for Bundle offers"}</s-link>
          </div>
        </section>

        <section style={cardStyle}>
          <div><div style={eyebrowStyle}>Show offers on your store</div><h2 style={titleStyle}>Website setup</h2></div>
          <p style={copyStyle}>Add the app block in your Shopify theme editor, then test it on your live product or bundle page.</p>
          <s-link href={storefrontSetupHref}>Open Website Template Setup</s-link>
        </section>

        <section style={cardStyle}>
          <div><div style={eyebrowStyle}>Plan & billing</div><h2 style={titleStyle}>{plan.isPro ? "Your Pro plan is active" : "You are on the Free plan"}</h2></div>
          <p style={copyStyle}>{plan.isPro ? "Manage or cancel your subscription in Shopify Admin → Settings → Billing." : "The Free plan includes one active quantity offer. Start a 14-day Pro trial for bundle offers and unlimited quantity offers."}</p>
          <s-link href={billingHref}>Open Plans & billing</s-link>
        </section>

        <section style={cardStyle}>
          <div><div style={eyebrowStyle}>Quick fixes</div><h2 style={titleStyle}>Common questions</h2></div>
          <div style={faqGridStyle}>
            <Faq question="My discount is not showing" answer="Check that the offer is active, the product is in the selected collection, and the cart meets the quantity rule." />
            <Faq question="Do shoppers need a discount code?" answer="No. Eligible offers are automatic. Shopify applies the discount when the cart qualifies." />
            <Faq question="The website block is not visible" answer="Open Website Template Setup, add the app block to the correct template, and save the theme." />
            <Faq question="I still need help" answer={`Email ${supportEmail}. Include your store URL, offer name, and a screenshot so we can investigate quickly.`} />
          </div>
        </section>
      </div>
    </s-page>
  );
}

function Step({ number, title, copy }) { return <div style={stepStyle}><span style={stepNumberStyle}>{number}</span><div><h3 style={stepTitleStyle}>{title}</h3><p style={copyStyle}>{copy}</p></div></div>; }
function Faq({ question, answer }) { return <details style={faqStyle}><summary style={faqQuestionStyle}>{question}</summary><p style={faqAnswerStyle}>{answer}</p></details>; }

function buildEmbeddedHref(path, search, shop) {
  const searchParams = new URLSearchParams(search);

  if (shop && !searchParams.has("shop")) {
    searchParams.set("shop", shop);
  }

  const query = searchParams.toString();

  return query ? `${path}?${query}` : path;
}

const pageStyle = { display: "grid", gap: "1rem", maxWidth: "860px" };
const heroStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", padding: "1.25rem", borderRadius: "1rem", background: "linear-gradient(135deg, #0f172a, #065f46)", color: "#fff" };
const eyebrowStyle = { color: "#047857", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em" };
const heroTitleStyle = { margin: "0.2rem 0", fontSize: "1.35rem" };
const heroCopyStyle = { margin: 0, color: "rgba(255,255,255,0.9)" };
const emailButtonStyle = { display: "inline-flex", alignItems: "center", minHeight: "2.5rem", padding: "0 0.9rem", borderRadius: "0.6rem", background: "#fff", color: "#065f46", fontWeight: 800, textDecoration: "none" };
const supportContactStyle = { display: "grid", gap: "0.4rem", justifyItems: "start" };
const emailAddressStyle = { color: "rgba(255,255,255,0.9)", fontSize: "0.86rem" };
const cardStyle = { display: "grid", gap: "0.85rem", padding: "1.1rem", border: "1px solid #e2e8f0", borderRadius: "1rem", background: "#fff" };
const titleStyle = { margin: "0.15rem 0 0", fontSize: "1.15rem", color: "#0f172a" };
const copyStyle = { margin: 0, color: "#475569", lineHeight: 1.55 };
const stepsGridStyle = { display: "grid", gap: "0.8rem" };
const stepStyle = { display: "flex", gap: "0.75rem", alignItems: "flex-start" };
const stepNumberStyle = { flex: "0 0 auto", width: "1.8rem", height: "1.8rem", display: "grid", placeItems: "center", borderRadius: "50%", background: "#dcfce7", color: "#047857", fontWeight: 800 };
const stepTitleStyle = { margin: "0 0 0.15rem", color: "#0f172a", fontSize: "1rem" };
const linkRowStyle = { display: "flex", gap: "1rem", flexWrap: "wrap" };
const faqGridStyle = { display: "grid", gap: "0.6rem" };
const faqStyle = { padding: "0.8rem", border: "1px solid #e2e8f0", borderRadius: "0.7rem" };
const faqQuestionStyle = { cursor: "pointer", color: "#0f172a", fontWeight: 750 };
const faqAnswerStyle = { margin: "0.6rem 0 0", color: "#475569", lineHeight: 1.55 };
