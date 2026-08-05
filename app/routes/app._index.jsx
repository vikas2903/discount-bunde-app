import { useMemo, useState } from "react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { listBundleDiscounts } from "../services/bundle-discount.server";
import { listVolumeDiscounts } from "../services/volume-discount.server";
import { getDiscountAnalytics } from "../services/analytics.server";
import { toErrorMessage } from "../utils/bundle-discount";
import { checkSubscription, getPlanDetails } from "../utils/billing.server";

export const loader = async ({ request }) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const subscription = await checkSubscription(billing);

  try {
    const [bundleResult, volumeResult] = await Promise.all([
      listBundleDiscounts(admin),
      listVolumeDiscounts(admin),
    ]);
    const discountTitles = [...bundleResult.discounts, ...volumeResult.discounts].map((discount) => discount.title);
    const analytics = await getDiscountAnalytics(admin, discountTitles);

    return {
      shop: session.shop,
      orders: analytics.orders,
      plan: getPlanDetails(subscription),
      loadError: [...bundleResult.graphqlErrors, ...volumeResult.graphqlErrors, ...analytics.graphqlErrors]
        .map(({ message }) => message)
        .join(" | ") || null,
    };
  } catch (error) {
    return { shop: session.shop, orders: [], plan: getPlanDetails(subscription), loadError: toErrorMessage(error) };
  }
};

export default function AppIndex() {
  const navigate = useNavigate();
  const { shop, orders, loadError, plan } = useLoaderData();
  const [days, setDays] = useState(30);
  const summary = useMemo(() => buildSummary(orders, days), [days, orders]);
  const money = formatMoney(summary.currencyCode);

  return (
    <s-page heading="Analytics">
      <div style={pageStyle}>
        <section style={heroStyle}>
          <div>
            <div style={eyebrowStyle}>Discount performance</div>
            <h2 style={headingStyle}>See how your offers perform</h2>
            <p style={copyStyle}>Last {days} days for {shop}. Your plan: {plan.name}.</p>
          </div>
          <div style={tabRowStyle}>
            {[7, 30].map((value) => <button key={value} type="button" onClick={() => setDays(value)} style={days === value ? activeTabStyle : tabStyle}>Last {value} days</button>)}
          </div>
        </section>

        {loadError ? <s-banner tone="warning"><s-paragraph>Analytics could not be fully loaded: {loadError}</s-paragraph><s-paragraph>After deploying the new <code>read_orders</code> permission, reinstall or reapprove the app for this store.</s-paragraph></s-banner> : null}

        <section style={statGridStyle}>
          <Metric label="Orders" value={summary.orderCount} detail="All orders in this period" />
          <Metric label="Revenue" value={money.format(summary.revenue)} detail="After discounts, excluding shipping" />
          <Metric label="Discounted orders" value={summary.discountedOrders} detail={`${summary.discountRate}% of orders used a discount`} />
          <Metric label="Customer savings" value={money.format(summary.savings)} detail="All applied discounts" />
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}><div><div style={eyebrowStyle}>Your app</div><h3 style={sectionTitleStyle}>Discount Bundle performance</h3></div></div>
          <div style={appMetricGridStyle}>
            <Metric label="Orders using your offers" value={summary.appDiscountOrders} detail="Matched by your discount titles" />
            <Metric label="Revenue from those orders" value={money.format(summary.appRevenue)} detail="Order revenue, not attribution-only revenue" />
            <Metric label="Average savings" value={money.format(summary.discountedOrders ? summary.savings / summary.discountedOrders : 0)} detail="Across all discounted orders" />
          </div>
          <p style={noteStyle}>Orders can include other promotions. “Your offers” matches automatic discount titles created by this app; it does not read customer information.</p>
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}><div><div style={eyebrowStyle}>Daily trend</div><h3 style={sectionTitleStyle}>Discounted orders by day</h3></div></div>
          {summary.days.length ? <div style={chartStyle}>{summary.days.map((day) => <div key={day.date} style={barGroupStyle}><div title={`${day.discountedOrders} discounted orders`} style={{ ...barStyle, height: `${Math.max(8, (day.discountedOrders / summary.maxDiscountedOrders) * 130)}px` }} /><span style={barValueStyle}>{day.discountedOrders}</span><span style={barLabelStyle}>{day.label}</span></div>)}</div> : <p style={copyStyle}>No orders were found in this period.</p>}
        </section>

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}><div><div style={eyebrowStyle}>Quick actions</div><h3 style={sectionTitleStyle}>Create or manage offers</h3></div></div>
          <div style={actionRowStyle}>
            <button type="button" style={buttonStyle} onClick={() => navigate("/app/volume_discounts")}>Quantity offers</button>
            <button type="button" style={buttonStyle} onClick={() => navigate("/app/disocunt_bundle")}>Bundle offers</button>
            <button type="button" style={buttonStyle} onClick={() => navigate("/app/help")}>Help & storefront setup</button>
          </div>
        </section>
      </div>
    </s-page>
  );
}

function buildSummary(orders, days) {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  const filtered = orders.filter((order) => new Date(order.createdAt) >= cutoff);
  const daily = new Map();
  for (let index = days - 1; index >= 0; index -= 1) { const date = new Date(); date.setDate(date.getDate() - index); daily.set(date.toISOString().slice(0, 10), { date: date.toISOString().slice(0, 10), label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }), discountedOrders: 0 }); }
  const summary = filtered.reduce((totals, order) => { totals.revenue += order.revenue; totals.savings += order.savings; totals.discountedOrders += order.hasDiscount ? 1 : 0; totals.appDiscountOrders += order.usesAppDiscount ? 1 : 0; totals.appRevenue += order.usesAppDiscount ? order.revenue : 0; const day = daily.get(order.createdAt.slice(0, 10)); if (day && order.hasDiscount) day.discountedOrders += 1; return totals; }, { revenue: 0, savings: 0, discountedOrders: 0, appDiscountOrders: 0, appRevenue: 0 });
  return { ...summary, orderCount: filtered.length, discountRate: filtered.length ? Math.round((summary.discountedOrders / filtered.length) * 100) : 0, currencyCode: filtered[0]?.currencyCode || "USD", days: [...daily.values()], maxDiscountedOrders: Math.max(1, ...[...daily.values()].map((day) => day.discountedOrders)) };
}

function Metric({ label, value, detail }) { return <div style={metricStyle}><div style={metricLabelStyle}>{label}</div><div style={metricValueStyle}>{value}</div><div style={metricDetailStyle}>{detail}</div></div>; }
const formatMoney = (currencyCode) => new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode });
const pageStyle = { display: "grid", gap: "1rem" }; const heroStyle = { display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "end", padding: "1.2rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "1rem" }; const eyebrowStyle = { color: "#047857", fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }; const headingStyle = { margin: "0.25rem 0", fontSize: "1.5rem" }; const copyStyle = { margin: 0, color: "#475569" }; const statGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.8rem" }; const appMetricGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.8rem" }; const metricStyle = { padding: "1rem", border: "1px solid #e2e8f0", borderRadius: "0.85rem", background: "#fff" }; const metricLabelStyle = { fontSize: "0.82rem", color: "#64748b", fontWeight: 700 }; const metricValueStyle = { marginTop: "0.35rem", color: "#0f172a", fontSize: "1.55rem", fontWeight: 800 }; const metricDetailStyle = { marginTop: "0.35rem", fontSize: "0.78rem", color: "#64748b" }; const sectionStyle = { padding: "1.1rem", border: "1px solid #e2e8f0", borderRadius: "1rem", background: "#fff", display: "grid", gap: "1rem" }; const sectionHeaderStyle = { display: "flex", justifyContent: "space-between" }; const sectionTitleStyle = { margin: "0.25rem 0 0", fontSize: "1.1rem" }; const noteStyle = { margin: 0, fontSize: "0.8rem", color: "#64748b" }; const tabRowStyle = { display: "flex", gap: "0.5rem" }; const tabStyle = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: "0.55rem", padding: "0.55rem 0.75rem", cursor: "pointer" }; const activeTabStyle = { ...tabStyle, background: "#047857", borderColor: "#047857", color: "#fff" }; const chartStyle = { display: "flex", alignItems: "end", gap: "0.45rem", minHeight: "185px", overflowX: "auto", padding: "0.5rem 0" }; const barGroupStyle = { minWidth: "38px", flex: 1, display: "grid", gap: "0.25rem", justifyItems: "center", alignItems: "end" }; const barStyle = { width: "22px", background: "#10b981", borderRadius: "0.4rem 0.4rem 0 0", transition: "height 0.2s" }; const barValueStyle = { fontSize: "0.75rem", fontWeight: 700 }; const barLabelStyle = { color: "#64748b", fontSize: "0.65rem", whiteSpace: "nowrap", transform: "rotate(-35deg)", marginTop: "0.6rem" }; const actionRowStyle = { display: "flex", gap: "0.7rem", flexWrap: "wrap" }; const buttonStyle = { border: "1px solid #0f766e", background: "#fff", borderRadius: "0.65rem", color: "#0f766e", fontWeight: 700, padding: "0.7rem 0.9rem", cursor: "pointer" };
export const headers = (headersArgs) => boundary.headers(headersArgs);
