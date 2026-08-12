import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(await readFile(path.join(root, "ports/registry.json"), "utf8"));
const required = ["name", "repository", "status", "coreVersion", "version", "category", "install"];
const names = new Set();
for (const [index, port] of registry.ports.entries()) {
  for (const field of required) if (!port[field]) throw new Error(`ports[${index}].${field} is required`);
  if (names.has(port.name)) throw new Error(`Duplicate port: ${port.name}`);
  names.add(port.name);
  if (!/^(umbrella|extracting|extracted)$/.test(port.status)) throw new Error(`Invalid status for ${port.name}: ${port.status}`);
  if (!/^v?\d+\.\d+\.\d+(?:\.\d+)?$/.test(port.version)) throw new Error(`Invalid version for ${port.name}: ${port.version}`);
  if (!/^v\d+\.\d+\.\d+$/.test(port.coreVersion)) throw new Error(`Core version must be a pinned tag for ${port.name}`);
  if (port.status === "umbrella") await access(path.join(root, port.install));
}
console.log(`Validated ${registry.ports.length} unique port records.`);
