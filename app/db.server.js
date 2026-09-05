import { PrismaClient } from "@prisma/client";

// Keep the app running locally before a DATABASE_URL is configured. Production
// deployments must use a persistent database so Shopify sessions survive
// restarts and billing redirects.
if (!process.env.DATABASE_URL) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[Shopify sessions] DATABASE_URL is required in production. Use a persistent database, or mount a Railway volume and set DATABASE_URL=file:/data/dev.sqlite.",
    );
  }

  process.env.DATABASE_URL = "file:./dev.sqlite";
}

if (
  process.env.NODE_ENV === "production" &&
  isRelativeSqliteUrl(process.env.DATABASE_URL)
) {
  throw new Error(
    "[Shopify sessions] Refusing to start production with relative SQLite session storage. Mount a Railway volume at /data and set DATABASE_URL=file:/data/dev.sqlite, or use a persistent database such as Postgres.",
  );
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();

export default prisma;

function isRelativeSqliteUrl(databaseUrl) {
  if (!databaseUrl?.startsWith("file:")) {
    return false;
  }

  const sqlitePath = databaseUrl.slice("file:".length);

  return (
    sqlitePath.startsWith("./") ||
    sqlitePath.startsWith("../") ||
    !sqlitePath.startsWith("/")
  );
}
