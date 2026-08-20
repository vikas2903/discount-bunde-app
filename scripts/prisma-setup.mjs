import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Prisma validates DATABASE_URL even while generating its client. This fallback
// lets a local build complete when the variable has not been set yet.
// A configured production DATABASE_URL always takes precedence.
const environment = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.sqlite",
};
const prismaCli = fileURLToPath(
  new URL("../node_modules/prisma/build/index.js", import.meta.url),
);

for (const args of [["generate"], ["migrate", "deploy"]]) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    env: environment,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
