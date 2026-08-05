import { authenticate } from "../shopify.server";
import db from "../db.server";

// This app doesn't store shopper or order data. We still authenticate every
// compliance webhook and erase our shop session when Shopify requests it.
export const action = async ({ request }) => {
  const { shop, topic } = await authenticate.webhook(request);

  if (topic === "SHOP_REDACT") {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response(null, { status: 200 });
};
