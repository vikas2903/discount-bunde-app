/* global process */
import { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { listBundleDiscounts } from "../services/bundle-discount.server";
import { listVolumeDiscounts } from "../services/volume-discount.server";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const [themesResult, bundleResult, quantityResult] = await Promise.allSettled([
    admin.graphql(`#graphql
      query StorefrontThemes {
        themes(first: 50) { nodes { id name role } }
      }`),
    listBundleDiscounts(admin),
    listVolumeDiscounts(admin),
  ]);

  const themeResponse = themesResult.status === "fulfilled"
    ? await themesResult.value.json()
    : null;
  const themes = (themeResponse?.data?.themes?.nodes || []).map((theme) => ({
    ...theme,
    numericId: theme.id.split("/").pop(),
  }));
  const bundleOffers = bundleResult.status === "fulfilled" ? bundleResult.value.discounts : [];
  const quantityOffers = quantityResult.status === "fulfilled" ? quantityResult.value.discounts : [];

  return {
    shop: session.shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    themes,
    bundleOffers,
    quantityOffers,
    loadError: [
      ...(themesResult.status === "rejected" ? ["Themes could not be loaded."] : themeResponse?.errors?.map((error) => error.message) || []),
      ...(bundleResult.status === "rejected" ? ["Bundle offers could not be loaded."] : bundleResult.value.graphqlErrors.map((error) => error.message)),
      ...(quantityResult.status === "rejected" ? ["Quantity offers could not be loaded."] : quantityResult.value.graphqlErrors.map((error) => error.message)),
    ].join(" ") || null,
  };
};

export default function StorefrontSetupPage() {
  const { shop, apiKey, themes, bundleOffers, quantityOffers, loadError } = useLoaderData();
  const liveThemes = themes.filter((theme) => theme.role === "MAIN");
  const [selectedThemeId, setSelectedThemeId] = useState(liveThemes[0]?.id || themes[0]?.id || "");
  const selectedTheme = useMemo(
    () => themes.find((theme) => theme.id === selectedThemeId) || themes[0],
    [selectedThemeId, themes],
  );

  return (
    <s-page heading="Storefront setup">
      <div style={pageStyle}>
        <section style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>Theme extension</div>
            <h2 style={{ margin: "0.25rem 0", fontSize: "1.45rem" }}>Choose a theme, then add your offer block</h2>
            <p style={heroCopyStyle}>Use a page template for mix-and-match bundles, or a product template for quantity offers. Your app discounts remain the source of truth at checkout.</p>
          </div>
        </section>

        {loadError ? <s-banner tone="warning"><s-paragraph>{loadError}</s-paragraph></s-banner> : null}

        <div style={metricGridStyle}>
          <Metric label="Bundle offers" value={bundleOffers.length} detail={`${bundleOffers.filter((offer) => offer.status === "ACTIVE").length} active`} />
          <Metric label="Quantity offers" value={quantityOffers.length} detail={`${quantityOffers.filter((offer) => offer.status === "ACTIVE").length} active`} />
          <Metric label="Store themes" value={themes.length} detail={`${liveThemes.length} live theme`} />
        </div>

        <section style={sectionStyle}>
          <div><div style={eyebrowStyle}>Step 1</div><h3 style={titleStyle}>Select a theme</h3><p style={copyStyle}>Choose one theme to set up. Live themes are visible to shoppers; preview and development themes are best for testing.</p></div>
          {themes.length ? <>
            <label style={selectLabelStyle}>Theme to customize<select value={selectedThemeId} onChange={(event) => setSelectedThemeId(event.target.value)} style={selectStyle}>{themes.map((theme) => <option key={theme.id} value={theme.id}>{theme.name} — {theme.role === "MAIN" ? "Live" : theme.role === "DEVELOPMENT" ? "Development" : "Preview"}</option>)}</select></label>
            {selectedTheme ? <ThemeCard theme={selectedTheme} shop={shop} apiKey={apiKey} /> : null}
          </> : <p style={copyStyle}>No themes were returned. Check that the app has permission to read themes, then reopen this page.</p>}
        </section>

        <section style={sectionStyle}>
          <div><div style={eyebrowStyle}>Step 2</div><h3 style={titleStyle}>Choose the storefront block</h3><p style={copyStyle}>Click a button in the selected theme panel. You will be redirected to Shopify’s theme editor with the block ready to add. Use the editor’s left-side settings to customize colors, collection, offers, text, and checkout button, then save.</p></div>
          <div style={templateGridStyle}>
            <TemplateCard name="Bundle template 1" type="Page template" description="A mix-and-match collection bundle with live selected products, savings, and checkout summary." steps={["Create a Page template in the theme editor.", "Add Bundle template 1 and select the bundle collection.", "Create a Shopify Page and assign this page template."]} />
            <TemplateCard name="Bundle template 2" type="Page template" description="An alternative bundle layout for presenting the same collection-based offer to shoppers." steps={["Create a Page template in the theme editor.", "Add Bundle template 2 and configure its collection and tiers.", "Assign the page template to a Shopify Page."]} />
            <TemplateCard name="Quantity offers" type="Product template" description="A buy-more-save-more offer displayed on individual product pages." steps={["Create a Product template in the theme editor.", "Add Quantity offers in Product information.", "Assign the product template to the relevant products in Shopify Admin."]} />
          </div>
        </section>

        <section style={tipStyle}>
          <strong>Before publishing:</strong> match the collection, quantities, discount type, and values in the theme block with the active offer created in this app. Test the template on an unpublished theme before applying it to your live theme.
        </section>
      </div>
    </s-page>
  );
}

function ThemeCard({ theme, shop, apiKey }) {
  const isLive = theme.role === "MAIN";
  const status = isLive ? "Live theme" : theme.role === "DEVELOPMENT" ? "Development preview" : "Preview theme";
  const editorBase = `https://${shop}/admin/themes/${theme.numericId}/editor`;
  const pageUrl = `${editorBase}?template=page&addAppBlockId=${apiKey}/bundle&target=newAppsSection`;
  const bundleTwoUrl = `${editorBase}?template=page&addAppBlockId=${apiKey}/bundle1&target=newAppsSection`;
  const productUrl = `${editorBase}?template=product&addAppBlockId=${apiKey}/quantity_offers&target=mainSection`;
  return <article style={{ ...themeCardStyle, borderColor: isLive ? "#059669" : "#dbe4ea" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "start" }}><strong>{theme.name}</strong><span style={{ ...statusStyle, background: isLive ? "#d1fae5" : "#eff6ff", color: isLive ? "#047857" : "#1d4ed8" }}>{status}</span></div>
    <p style={copyStyle}>{isLive ? "This is currently visible to shoppers." : "This theme is not currently live, so you can safely customize and test it first."}</p>
    <div style={buttonRowStyle}><a href={pageUrl} target="_top" style={buttonStyle}>Set up Bundle template 1</a><a href={bundleTwoUrl} target="_top" style={secondaryButtonStyle}>Set up Bundle template 2</a><a href={productUrl} target="_top" style={secondaryButtonStyle}>Set up Quantity offers</a></div>
    <p style={editorHintStyle}>Each option opens the theme editor. Add the block, customize its settings, and click Save when finished.</p>
  </article>;
}

function TemplateCard({ name, type, description, steps }) {
  return <article style={templateCardStyle}><span style={typeStyle}>{type}</span><h4 style={{ margin: "0.6rem 0 0.4rem" }}>{name}</h4><p style={copyStyle}>{description}</p><ol style={stepsStyle}>{steps.map((step) => <li key={step}>{step}</li>)}</ol></article>;
}

function Metric({ label, value, detail }) { return <article style={metricStyle}><span style={{ color: "#64748b", fontSize: "0.84rem", fontWeight: 700 }}>{label}</span><strong style={{ display: "block", fontSize: "1.7rem", marginTop: "0.25rem" }}>{value}</strong><span style={{ color: "#64748b", fontSize: "0.8rem" }}>{detail}</span></article>; }

const pageStyle = { display: "grid", gap: "1rem", maxWidth: "1120px" };
const heroStyle = { padding: "1.35rem", borderRadius: "1rem", background: "linear-gradient(135deg, #0f172a, #075985)", color: "#fff" };
const heroCopyStyle = { margin: 0, maxWidth: "720px", color: "#e0f2fe", lineHeight: 1.55 };
const eyebrowStyle = { color: "#047857", fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" };
const titleStyle = { margin: "0.2rem 0 0", fontSize: "1.15rem" };
const copyStyle = { margin: 0, color: "#475569", lineHeight: 1.5, fontSize: "0.9rem" };
const metricGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.8rem" };
const metricStyle = { padding: "1rem", background: "#fff", border: "1px solid #dbe4ea", borderRadius: "0.85rem" };
const sectionStyle = { display: "grid", gap: "1rem", padding: "1.15rem", background: "#fff", border: "1px solid #dbe4ea", borderRadius: "1rem" };
const themeCardStyle = { display: "grid", gap: "0.8rem", padding: "1rem", border: "1px solid", borderRadius: "0.8rem", background: "#fff" };
const statusStyle = { flex: "0 0 auto", padding: "0.25rem 0.5rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 800 };
const buttonRowStyle = { display: "flex", gap: "0.45rem", flexWrap: "wrap" };
const selectLabelStyle = { display: "grid", gap: "0.4rem", maxWidth: "600px", color: "#334155", fontSize: "0.86rem", fontWeight: 750 };
const selectStyle = { width: "100%", minHeight: "42px", padding: "0.55rem 0.7rem", border: "1px solid #94a3b8", borderRadius: "0.55rem", background: "#fff", color: "#0f172a", font: "inherit" };
const buttonStyle = { padding: "0.5rem 0.7rem", borderRadius: "0.5rem", background: "#047857", color: "#fff", textDecoration: "none", fontWeight: 750, fontSize: "0.8rem" };
const secondaryButtonStyle = { ...buttonStyle, background: "#eff6ff", color: "#1e3a8a" };
const templateGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.8rem" };
const templateCardStyle = { padding: "1rem", border: "1px solid #dbe4ea", borderRadius: "0.8rem", background: "#f8fafc" };
const typeStyle = { padding: "0.2rem 0.5rem", borderRadius: "999px", background: "#dbeafe", color: "#1d4ed8", fontSize: "0.7rem", fontWeight: 800 };
const stepsStyle = { margin: "0.8rem 0 0", paddingLeft: "1.2rem", display: "grid", gap: "0.45rem", color: "#334155", fontSize: "0.85rem", lineHeight: 1.45 };
const tipStyle = { padding: "1rem", borderRadius: "0.8rem", background: "#ecfdf5", color: "#065f46", lineHeight: 1.5 };
const editorHintStyle = { margin: 0, padding: "0.65rem 0.75rem", borderRadius: "0.55rem", background: "#f0f9ff", color: "#075985", fontSize: "0.82rem", lineHeight: 1.45 };
