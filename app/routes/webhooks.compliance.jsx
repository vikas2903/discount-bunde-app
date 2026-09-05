import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async () => {
  return new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
};

// This app doesn't store shopper or order data. We still authenticate every
// compliance webhook and erase our shop session when Shopify requests it.
export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  if (topic === "SHOP_REDACT") {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
};
