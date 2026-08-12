import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.join(root, "node_modules/@kiriketsuki/chrysaki-core");
const sourceManifest = JSON.parse(await readFile(path.join(packageRoot, "tokens/chrysaki.json"), "utf8"));
const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
if (sourceManifest.metadata.version !== packageJson.version) {
  throw new Error(`Core manifest/package version mismatch: ${sourceManifest.metadata.version} != ${packageJson.version}`);
}
const target = path.join(root, "core");
await mkdir(target, { recursive: true });
for (const filename of ["chrysaki.json", "chrysaki.css", "chrysaki.scss", "chrysaki.ts", "chrysaki-ansi.json", "chrysaki.sh"]) {
  await cp(path.join(packageRoot, "dist", filename), path.join(target, filename));
}
await cp(path.join(packageRoot, "tokens/chrysaki.json"), path.join(target, "manifest.json"));
console.log(`Synced chrysaki-core v${packageJson.version}.`);
