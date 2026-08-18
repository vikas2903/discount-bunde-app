import { authenticate } from "../shopify.server";
import db from "../db.server";

// Erase every record held for the shop. The database currently contains only
// Shopify app sessions, including the shop access token and merchant session.
export const action = async ({ request }) => {
  const { shop } = await authenticate.webhook(request);

  await db.session.deleteMany({ where: { shop } });

  return new Response(null, { status: 200 });
};
