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
    const offers = [
      ...bundleResult.discounts.map((discount) => toOffer(discount, "Bundle")),
      ...volumeResult.discounts.map((discount) => toOffer(discount, "Quantity")),
    ];
    const orders = analytics.orders.filter((order) => order.usesAppDiscount);

    return {
      shop: session.shop,
      orders,
      offers: summarizeOffers(offers, orders),
      loadError: [
        ...bundleResult.graphqlErrors,
        ...volumeResult.graphqlErrors,
        ...analytics.graphqlErrors,
      ].map(({ message }) => message).join(" | ") || null,
    };
  } catch (error) {
    return { shop: session.shop, orders: [], offers: [], loadError: toErrorMessage(error) };
  }
};

export default function AnalyticsPage() {
  const { shop, orders, offers, loadError } = useLoaderData();
  const currency = orders[0]?.currencyCode || "USD";
  const money = new Intl.NumberFormat(undefined, { style: "currency", currency });
  const savings = orders.reduce((total, order) => total + order.savings, 0);
  const revenue = orders.reduce((total, order) => total + order.revenue, 0);
  const activeOffers = offers.filter((offer) => offer.status === "ACTIVE").length;

  return (
    <s-page heading="Analytics">
      <div style={{ display: "grid", gap: "1rem" }}>
        <p style={{ margin: 0, color: "#64748b" }}>
          Last 30 days for {shop}. These numbers include only offers created in this app.
        </p>
        {loadError ? <s-banner tone="warning"><s-paragraph>{loadError}</s-paragraph></s-banner> : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.8rem" }}>
          <Metric label="Offers created" value={offers.length} detail={`${activeOffers} active offer${activeOffers === 1 ? "" : "s"}`} />
          <Metric label="Offer orders" value={orders.length} detail="Orders using your app offers" />
          <Metric label="Customer savings" value={money.format(savings)} detail="Savings from your app offers" />
          <Metric label="Offer revenue" value={money.format(revenue)} detail="Full order value for matched orders" />
        </div>
        <section style={{ overflowX: "auto", border: "1px solid #dbe4ea", borderRadius: "0.85rem", background: "#fff" }}>
          <table style={{ width: "100%", minWidth: "760px", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <HeaderCell>Offer</HeaderCell>
                <HeaderCell>Type</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell>Orders</HeaderCell>
                <HeaderCell>Revenue</HeaderCell>
                <HeaderCell>Savings</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {offers.length > 0 ? offers.map((offer) => (
                <tr key={`${offer.type}-${offer.id}`}>
                  <BodyCell>{offer.title}</BodyCell>
                  <BodyCell>{offer.type}</BodyCell>
                  <BodyCell>{offer.status === "ACTIVE" ? "Active" : "Draft"}</BodyCell>
                  <BodyCell>{offer.orderCount}</BodyCell>
                  <BodyCell>{money.format(offer.revenue)}</BodyCell>
                  <BodyCell>{money.format(offer.savings)}</BodyCell>
                </tr>
              )) : (
                <tr><BodyCell colSpan={6}>No quantity or bundle offers have been created in this app yet.</BodyCell></tr>
              )}
            </tbody>
          </table>
        </section>
        <s-banner tone="info"><s-paragraph>Analytics uses order totals and discount data only. It does not read customer information.</s-paragraph></s-banner>
      </div>
    </s-page>
  );
}

function Metric({ label, value, detail }) {
  return <section style={{ padding: "1rem", border: "1px solid #dbe4ea", borderRadius: "0.85rem", background: "#fff" }}><div style={{ color: "#64748b", fontSize: "0.85rem", fontWeight: 700 }}>{label}</div><strong style={{ display: "block", marginTop: "0.35rem", fontSize: "1.55rem" }}>{value}</strong><div style={{ marginTop: "0.35rem", color: "#64748b", fontSize: "0.8rem" }}>{detail}</div></section>;
}

function HeaderCell({ children }) {
  return <th style={tableHeaderStyle}>{children}</th>;
}

function BodyCell({ children, colSpan }) {
  return <td colSpan={colSpan} style={tableCellStyle}>{children}</td>;
}

function toOffer(discount, type) {
  return {
    id: discount.discountId,
    title: discount.title,
    type,
    status: discount.status,
    identifiers: [discount.title, discount.config?.message]
      .map(normalizeIdentifier)
      .filter(Boolean),
  };
}

function summarizeOffers(offers, orders) {
  return offers.map((offer) => {
    const matchingOrders = orders.filter((order) =>
      order.applications.some((application) =>
        offer.identifiers.includes(normalizeIdentifier(application)),
      ),
    );

    return {
      ...offer,
      orderCount: matchingOrders.length,
      revenue: matchingOrders.reduce((total, order) => total + order.revenue, 0),
      savings: matchingOrders.reduce((total, order) => total + order.savings, 0),
    };
  });
}

function normalizeIdentifier(value) {
  return String(value || "").trim().toLocaleLowerCase();
}

const tableHeaderStyle = { padding: "0.85rem 1rem", textAlign: "left", color: "#475569", fontSize: "0.8rem", borderBottom: "1px solid #dbe4ea" };
const tableCellStyle = { padding: "0.9rem 1rem", borderBottom: "1px solid #eef2f7", color: "#1e293b" };
