import { PrismaClient } from "@prisma/client";

// Keep the app running on a fresh Render service before a DATABASE_URL is
// configured. A real Render DATABASE_URL always overrides this local fallback.
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
