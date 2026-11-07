import { mkdir, writeFile } from "node:fs/promises";

const url = "https://update.greasyfork.org/scripts/557720/vBlockTube.user.js";
const expectedVersion = process.env.VBLOCKTUBE_VERSION || "2.1.0";

const response = await fetch(url, {
  headers: { "User-Agent": "Pake-vBlockTube-build/1.0" },
  signal: AbortSignal.timeout(30000)
});
if (!response.ok) throw new Error(`Could not download vBlockTube: HTTP ${response.status}`);

const source = await response.text();
const version = source.match(/^\s*\/\/\s*@version\s+([^\s]+)/m)?.[1];
if (!version) throw new Error("Downloaded file is missing the userscript @version.");
if (version !== expectedVersion) {
  throw new Error(`vBlockTube version mismatch: expected ${expectedVersion}, received ${version}. Review upstream, then update the pin.`);
}

const body = source.replace(
  /^\s*\/\/\s*==UserScript==[\s\S]*?^\s*\/\/\s*==\/UserScript==\s*/m,
  ""
).trimStart();

if (body === source || !body.includes("GM_getValue")) {
  throw new Error("Could not safely remove userscript metadata or GM APIs were not found.");
}
await mkdir("tools", { recursive: true });
await writeFile("tools/vblocktube.js",
  `/* Upstream vBlockTube ${version}; metadata removed by prepare script */\n${body}\n`);
console.log(`Prepared vBlockTube ${version} (${body.length} characters).`);
