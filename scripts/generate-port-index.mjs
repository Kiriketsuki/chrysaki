import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(await readFile(path.join(root, "ports/registry.json"), "utf8"));
const rows = registry.ports
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((port) => `| ${port.name} | ${port.category} | ${port.status} | ${port.version} | ${port.coreVersion} | [repository](${port.repository}) | \`${port.install}\` |`);
const document = `# Chrysaki port registry\n\nGenerated from \`ports/registry.json\`. Do not edit manually.\n\n| Port | Category | State | Version | Core | Repository | Install |\n|:-----|:---------|:------|:--------|:-----|:-----------|:--------|\n${rows.join("\n")}\n\nCompatibility paths remain available until every port is extracted. See [compatibility policy](COMPATIBILITY.md).\n`;
await writeFile(path.join(root, "docs/PORTS.md"), document);
console.log(`Generated port index for ${rows.length} integrations.`);
