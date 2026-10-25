/**
 * Smoke test: speak MCP to the server over an in-memory transport, list the
 * tools, and call one for real against a running API.
 *
 *   node test.mjs                                    # protocol only
 *   STADIQ_API_KEY=… STADIQ_BASE_URL=… node test.mjs # + a live call
 */
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server, targetQuery } from "./server.mjs";

// ── target resolution ───────────────────────────────────────────────────────
assert.equal(targetQuery({ lat: 51.2194, lng: 4.4025 }), "lat=51.2194&lng=4.4025");
assert.equal(targetQuery({ locationId: "abc", lat: 1, lng: 2 }), "locationId=abc");
assert.throws(() => targetQuery({ lat: 51.2 }), /both lat and lng/);
console.log("ok   target resolution");

// ── protocol ────────────────────────────────────────────────────────────────
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: "smoke-test", version: "0" });
await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

const { tools } = await client.listTools();
const names = tools.map(t => t.name).sort();
assert.deepEqual(names, [
  "stadiq_air_quality",
  "stadiq_briefing",
  "stadiq_disruptions",
  "stadiq_locations",
]);
for (const tool of tools) {
  assert.ok(tool.description?.length > 40, `${tool.name} needs a real description`);
  assert.equal(tool.annotations?.readOnlyHint, true, `${tool.name} must be marked read-only`);
}
console.log(`ok   ${tools.length} tools exposed, all read-only`);

// ── one live call, when a key is present ────────────────────────────────────
if (process.env.STADIQ_API_KEY) {
  const res = await client.callTool({
    name: "stadiq_briefing",
    arguments: { lat: 51.2194, lng: 4.4025 },
  });
  assert.ok(!res.isError, `briefing failed: ${JSON.stringify(res.content)}`);
  const risk = res.structuredContent?.briefing?.risk;
  assert.ok(["low", "moderate", "elevated", "high"].includes(risk), `unexpected risk: ${risk}`);
  console.log(`ok   live briefing call → risk "${risk}"`);
} else {
  console.log("skip live call (set STADIQ_API_KEY to include it)");
}

await client.close();
console.log("\nmcp smoke test passed");
process.exit(0);
