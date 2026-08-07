import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { getDiscountAnalytics } from "../services/analytics.server";
import { listBundleDiscounts } from "../services/bundle-discount.server";
import { listVolumeDiscounts } from "../services/volume-discount.server";
import { toErrorMessage } from "../utils/bundle-discount";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    const [bundleResult, volumeResult] = await Promise.all([
      listBundleDiscounts(admin),
      listVolumeDiscounts(admin),
    ]);
    const identifiers = [...bundleResult.discounts, ...volumeResult.discounts]
      .flatMap((discount) => [discount.title, discount.config?.message])
      .filter(Boolean);
    const analytics = await getDiscountAnalytics(admin, identifiers);

    return {
      shop: session.shop,
      // Keep the dashboard scoped to discounts created by this app. Shopify
      // returns all store orders, including orders using other apps and codes.
      orders: analytics.orders.filter((order) => order.usesAppDiscount),
      loadError: [
        ...bundleResult.graphqlErrors,
        ...volumeResult.graphqlErrors,
        ...analytics.graphqlErrors,
      ].map(({ message }) => message).join(" | ") || null,
    };
  } catch (error) {
    return { shop: session.shop, orders: [], loadError: toErrorMessage(error) };
  }
};

export default function AnalyticsPage() {
  const { shop, orders, loadError } = useLoaderData();
  const currency = orders[0]?.currencyCode || "USD";
  const money = new Intl.NumberFormat(undefined, { style: "currency", currency });
  const savings = orders.reduce((total, order) => total + order.savings, 0);
  const revenue = orders.reduce((total, order) => total + order.revenue, 0);

  return (
    <s-page heading="Analytics">
      <div style={{ display: "grid", gap: "1rem" }}>
        <p style={{ margin: 0, color: "#64748b" }}>
          Last 30 days for {shop}. Only orders using this app&apos;s offers are included.
        </p>
        {loadError ? <s-banner tone="warning"><s-paragraph>{loadError}</s-paragraph></s-banner> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.8rem" }}>
          <Metric label="Offer orders" value={orders.length} detail="Orders using your app offers" />
          <Metric label="Customer savings" value={money.format(savings)} detail="Savings from your app offers" />
          <Metric label="Offer revenue" value={money.format(revenue)} detail="Full order value for matched orders" />
        </div>
        <s-banner tone="info"><s-paragraph>Analytics uses order totals and discount data only. It does not read customer information.</s-paragraph></s-banner>
      </div>
    </s-page>
  );
}

function Metric({ label, value, detail }) {
  return <section style={{ padding: "1rem", border: "1px solid #dbe4ea", borderRadius: "0.85rem", background: "#fff" }}><div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 700 }}>{label}</div><strong style={{ display: "block", marginTop: "0.35rem", fontSize: "1.55rem" }}>{value}</strong><div style={{ marginTop: "0.35rem", color: "#64748b", fontSize: "0.8rem" }}>{detail}</div></section>;
}
