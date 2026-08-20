import { PrismaClient } from "@prisma/client";

// Keep the app running locally before a DATABASE_URL is configured. Production
// deployments must use a persistent database so Shopify sessions survive
// restarts and billing redirects.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dev.sqlite";
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();

export default prisma;
