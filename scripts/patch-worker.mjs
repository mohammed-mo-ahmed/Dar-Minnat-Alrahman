import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const workerPath = join(import.meta.dirname, "..", ".open-next", "_worker.js");

let code = await readFile(workerPath, "utf8");

const staticCheck = `
async fetch(request, env, ctx) {
  var url = new URL(request.url);
  if (url.pathname.startsWith("/_next/") || url.pathname === "/favicon.ico") {
    try {
      var asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
    } catch (e) {}
  }
  return runWithCloudflareRequestContext(request, env, ctx, async () => {
`;

code = code.replace(
  'async fetch(request, env, ctx) {\n        return runWithCloudflareRequestContext(request, env, ctx, async () => {',
  staticCheck
);

await writeFile(workerPath, code);
