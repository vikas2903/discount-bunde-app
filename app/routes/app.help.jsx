import { Form, useLoaderData, useNavigation } from "react-router";
import { authenticate } from "../shopify.server";
import { checkSubscription, getPlanDetails, requireProSubscription } from "../utils/billing.server";

const SUPPORT_EMAIL = "vikasprasad2903@gmail.com";

export const loader = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  return {
    plan: getPlanDetails(subscription),
    themeEditorUrl: `https://${session.shop}/admin/themes/current/editor?template=page&addAppBlockId=${apiKey}/bundle&target=newAppsSection`,
  };
};

export const action = async ({ request }) => {
  const { billing, session } = await authenticate.admin(request);
  await requireProSubscription(billing, request, session.shop);
  return null;
};

export default function HelpPage() {
  const { plan, themeEditorUrl } = useLoaderData();
  const navigation = useNavigation();

  return (
    <s-page heading="Help, support & storefront setup">
      <div style={pageStyle}>
        <section style={heroStyle}>
          <div style={heroIconStyle} aria-hidden="true">?</div>
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.35rem" }}>We are here to help</h2>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.9)" }}>Questions about discounts, your bundle page, or checkout setup?</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={emailStyle}>Email {SUPPORT_EMAIL}</a>
          </div>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeadingStyle}><span style={sectionIconStyle}>1</span><div><div style={eyebrowStyle}>Create an offer</div><h3 style={titleStyle}>How to create a discount</h3></div></div>
          <ol style={stepsStyle}>
            <li>Open <strong>Quantity offers</strong> for a buy-more-save-more promotion, or <strong>Bundle offers</strong> for a fixed-price mix-and-match bundle.</li>
            <li>Give the offer a clear name, select eligible collections, and add its quantity and saving rules.</li>
            <li>Save the offer, then test it in your cart before sharing it with shoppers.</li>
          </ol>
          <p style={tipStyle}>Free includes one active quantity offer. Bundle offers and storefront setup require Pro.</p>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeadingStyle}><span style={sectionIconStyle}>2</span><div><div style={eyebrowStyle}>Show it on your store</div><h3 style={titleStyle}>Add the Bundle Section theme block</h3></div></div>
          {!plan.isPro ? <s-banner tone="info"><s-paragraph>Start the 14-day Pro trial to add the storefront bundle page.</s-paragraph></s-banner> : null}
          <ol style={stepsStyle}>
            <li>Create a collection containing only the products included in the bundle.</li>
            <li>Create a fixed-price bundle offer in this app and select that same collection.</li>
            <li>Open the theme editor, save the Bundle Section on a page template such as <code>page.bundle</code>, and select the same collection.</li>
            <li>Create a Shopify Page, assign the page template, then add that page to your store navigation.</li>
            <li>Test the bundle with an empty cart and again with unrelated cart products.</li>
          </ol>
          {plan.isPro ? <s-link href={themeEditorUrl} target="_top">Open theme editor and add Bundle Section</s-link> : <Form method="post" reloadDocument><s-button type="submit" variant="primary" loading={navigation.state !== "idle"}>Start 14-day Pro trial</s-button></Form>}
          <p style={tipStyle}>Use the same collection, quantity, and fixed price in the app and theme block. Shopify calculates the final discount securely at cart and checkout.</p>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeadingStyle}><span style={sectionIconStyle}>3</span><div><div style={eyebrowStyle}>Advanced checkout</div><h3 style={titleStyle}>GoKwik and Shiprocket setup</h3></div></div>
          <p style={copyStyle}>In the Bundle Section settings, select Custom checkout only when GoKwik or Shiprocket has supplied an approved storefront snippet. The app adds the selected items to Shopify cart first, then runs that provider code.</p>
          <s-banner tone="warning"><s-paragraph>Test provider code on a duplicate theme first. Never paste private API keys or change product prices in the snippet.</s-paragraph></s-banner>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeadingStyle}><span style={sectionIconStyle}>+</span><div><div style={eyebrowStyle}>Product page</div><h3 style={titleStyle}>Show quantity offers next to Add to cart</h3></div></div>
          <ol style={stepsStyle}>
            <li>Go to Online Store, Themes, and Customize. Open the Default product template.</li>
            <li>In the product information section, choose Add block, then Apps, then Quantity offers.</li>
            <li>Set the same tiers, saving types, and values as the active quantity offer in this app.</li>
            <li>Choose whether the shopper goes to cart, checkout, or your approved GoKwik or Shiprocket flow after adding the offer.</li>
          </ol>
          <p style={tipStyle}>The block adds the selected quantity to cart. Shopify then applies your active automatic quantity discount when the cart qualifies.</p>
        </section>

        <section style={cardStyle}>
          <div style={sectionHeadingStyle}><span style={sectionIconStyle}>FAQ</span><div><div style={eyebrowStyle}>Quick answers</div><h3 style={titleStyle}>Frequently asked questions</h3></div></div>
          <div style={faqGridStyle}>
            <Faq question="Why is my discount not showing?" answer="Check that it is active, the cart meets its quantity rule, and the product is in the selected collection." />
            <Faq question="Can shoppers use a discount code?" answer="These offers are automatic. Shoppers do not need to enter a code when their cart qualifies." />
            <Faq question="Why does the bundle page show a different price?" answer="The app discount controls checkout. Ensure the collection, quantity, and fixed price match the theme block settings." />
            <Faq question="How do I cancel Pro?" answer="Open Shopify Admin, then Settings and Billing. Cancel there; future use returns to the Free plan after the paid period." />
          </div>
        </section>
      </div>
    </s-page>
  );
}

function Faq({ question, answer }) { return <details style={faqStyle}><summary style={faqQuestionStyle}>{question}</summary><p style={copyStyle}>{answer}</p></details>; }
const pageStyle = { display: "grid", gap: "1rem", maxWidth: "900px" }; const heroStyle = { display: "flex", alignItems: "center", gap: "1rem", padding: "1.2rem", borderRadius: "1rem", background: "linear-gradient(135deg, #0f172a, #065f46)", color: "#fff" }; const heroIconStyle = { width: "3rem", height: "3rem", borderRadius: "50%", display: "grid", placeItems: "center", fontWeight: 800, fontSize: "1.4rem", background: "rgba(255,255,255,0.16)" }; const emailStyle = { color: "#fff", fontWeight: 800, width: "fit-content" }; const cardStyle = { display: "grid", gap: "0.9rem", padding: "1.1rem", border: "1px solid #e2e8f0", borderRadius: "1rem", background: "#fff" }; const sectionHeadingStyle = { display: "flex", alignItems: "center", gap: "0.75rem" }; const sectionIconStyle = { minWidth: "2.2rem", height: "2.2rem", borderRadius: "0.65rem", display: "grid", placeItems: "center", padding: "0 0.35rem", background: "#dcfce7", color: "#047857", fontWeight: 800, fontSize: "0.75rem" }; const eyebrowStyle = { color: "#047857", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.05em" }; const titleStyle = { margin: "0.15rem 0 0", fontSize: "1.1rem" }; const stepsStyle = { margin: 0, paddingLeft: "1.3rem", display: "grid", gap: "0.55rem", lineHeight: 1.55, color: "#334155" }; const copyStyle = { margin: 0, color: "#475569", lineHeight: 1.55 }; const tipStyle = { margin: 0, padding: "0.75rem", borderRadius: "0.65rem", background: "#f0fdf4", color: "#166534", fontSize: "0.86rem" }; const faqGridStyle = { display: "grid", gap: "0.65rem" }; const faqStyle = { padding: "0.85rem", border: "1px solid #e2e8f0", borderRadius: "0.7rem" }; const faqQuestionStyle = { cursor: "pointer", fontWeight: 750, color: "#0f172a" };
