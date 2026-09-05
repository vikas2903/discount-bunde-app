import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async () => {
  return new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
};

export const action = async ({ request }) => {
  const { payload, session, topic, shop } = await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);
  const current = payload.current;

  if (session?.id) {
    await db.session.updateMany({
      where: { id: session.id },
      data: { scope: current.toString() },
    });
  }

  return new Response("ok", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
};
