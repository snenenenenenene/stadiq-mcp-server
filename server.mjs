#!/usr/bin/env node
/**
 * Stadiq MCP server — the HTTP API as agent tools.
 *
 * stdio transport, four read-only tools over /api/v1. Auth is the same API
 * key as the REST API and the CLI:
 *
 *   STADIQ_API_KEY=sq_live_…  npx stadiq-mcp
 *
 * Claude Desktop / Cursor config:
 *   { "mcpServers": { "stadiq": {
 *       "command": "npx", "args": ["-y", "stadiq-mcp"],
 *       "env": { "STADIQ_API_KEY": "sq_live_…" } } } }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = process.env.STADIQ_BASE_URL ?? "https://stadiq.app";
const API_KEY = process.env.STADIQ_API_KEY;

/** Every location-scoped tool takes the same target. */
const TARGET_SHAPE = {
  lat: z.number().min(50.6).max(51.55).optional()
    .describe("Latitude of the point. Must be inside Flanders or Brussels. Pair with lng."),
  lng: z.number().min(2.5).max(5.95).optional()
    .describe("Longitude of the point. Pair with lat."),
  locationId: z.string().optional()
    .describe("Id of one of the account's saved locations, from stadiq_locations. Use instead of lat/lng."),
};

function targetQuery({ lat, lng, locationId }) {
  if (locationId) return `locationId=${encodeURIComponent(locationId)}`;
  if (lat === undefined || lng === undefined) {
    throw new Error(
      "Give either locationId, or both lat and lng. Call stadiq_locations to list the account's saved locations.",
    );
  }
  return `lat=${lat}&lng=${lng}`;
}

async function callApi(path) {
  if (!API_KEY) {
    throw new Error(
      "STADIQ_API_KEY is not set. Get a key at https://stadiq.app/developers and set it in the MCP server's env.",
    );
  }
  const res = await fetch(new URL(path, BASE), {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Pass the API's own guidance through — it already says what to do about
    // a bad key, an exhausted quota or an out-of-area coordinate.
    throw new Error(`Stadiq API ${res.status} ${data.error ?? ""}: ${data.message ?? "request failed"}`);
  }
  return data;
}

/** MCP wants text content; structuredContent carries the parsed object. */
function result(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

const server = new McpServer({ name: "stadiq", version: "0.1.2" });

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };

server.registerTool(
  "stadiq_locations",
  {
    title: "List monitored locations",
    description:
      "List the locations on the Stadiq account behind this API key, with their ids and coordinates. Use the returned id as locationId for the other tools.",
    inputSchema: {},
    annotations: READ_ONLY,
  },
  async () => result(await callApi("/api/v1/locations")),
);

server.registerTool(
  "stadiq_disruptions",
  {
    title: "Road works and transit disruptions",
    description:
      "Road works within 2 km of a point and De Lijn transit disruptions affecting it, plus counts of active, planned and imminent works. Covers Flanders and Brussels only.",
    inputSchema: TARGET_SHAPE,
    annotations: READ_ONLY,
  },
  async args => result(await callApi(`/api/v1/disruptions?${targetQuery(args)}`)),
);

server.registerTool(
  "stadiq_air_quality",
  {
    title: "Air quality and low-emission-zone status",
    description:
      "Latest NO2/PM reading from the nearest IRCELINE station for a point, how it compares to WHO and EU limits, and whether the point sits inside the Antwerp low-emission zone. Measured values only.",
    inputSchema: TARGET_SHAPE,
    annotations: READ_ONLY,
  },
  async args => result(await callApi(`/api/v1/air-quality?${targetQuery(args)}`)),
);

server.registerTool(
  "stadiq_briefing",
  {
    title: "Operations briefing",
    description:
      "Situational briefing for a point: risk level, key facts, the best and worst windows in the next 24 hours, and the next rush-hour NO2 peak. Deterministic — computed from live data, not generated prose.",
    inputSchema: TARGET_SHAPE,
    annotations: READ_ONLY,
  },
  async args => result(await callApi(`/api/v1/briefing?${targetQuery(args)}`)),
);

// Importing this file for the smoke test must not grab stdio.
if (process.argv[1] && process.argv[1].endsWith("server.mjs")) {
  await server.connect(new StdioServerTransport());
}

export { server, targetQuery };
