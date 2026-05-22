import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, "..");
const globalNpmBin = path.join(process.env.APPDATA || "", "npm");
const currentPath = process.env.Path || process.env.PATH || "";
const entries = currentPath.split(path.delimiter).filter(Boolean);

for (const entry of [extensionRoot, globalNpmBin]) {
  if (entry && !entries.includes(entry)) {
    entries.unshift(entry);
  }
}

const nextPath = entries.join(path.delimiter);

process.env.PATH = nextPath;
process.env.Path = nextPath;
