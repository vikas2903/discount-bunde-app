import crypto from "node:crypto";
const SECRET = process.env.SHOPIFY_WEBHOOK_SECRET || process.env.SHOPIFY_API_SECRET;
const verify = (req, raw) => {
  const h = req.headers.get("X-Shopify-Hmac-Sha256") || "";
  if (!SECRET || !h) return false;
  const dig = crypto.createHmac("sha256", SECRET).update(raw, "utf8").digest("base64");
  try { return crypto.timingSafeEqual(Buffer.from(dig), Buffer.from(h)); } catch { return false; }
};

export async function loader() {
  return new Response("ok", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function action({ request }) {
  const raw = await request.text();
  if (!verify(request, raw)) return new Response("hmac verification failed", { status: 401 });
  const topic = request.headers.get("X-Shopify-Topic") || "";
  const shop  = request.headers.get("X-Shopify-Shop-Domain") || "";
  // No customer or order records are persisted by this app, so there is no
  // customer-specific data to erase. Do not log the payload: it can contain PII.
  console.log("[WEBHOOK customers/redact]", { shop, topic });
  return new Response("ok", { status: 200, headers: { "Content-Type": "text/plain" } });
}
