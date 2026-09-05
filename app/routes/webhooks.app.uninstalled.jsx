import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async () => {
  return new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
};

export const action = async ({ request }) => {
  const { shop, session, topic } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger multiple times and after an app has already been uninstalled.
  // If this webhook already ran, the sessions may have been deleted previously.
  if (shop) {
    await db.session.deleteMany({ where: { shop } });
  }

  return new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
};
