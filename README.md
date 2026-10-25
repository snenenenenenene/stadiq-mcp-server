# Stadiq MCP server

An [MCP](https://modelcontextprotocol.io) server for the [Stadiq](https://stadiq.app?utm_source=github&utm_medium=directory&utm_campaign=listing-2026-10) API: road works, De Lijn transit disruptions, air quality and operations briefings for any point in Flanders and Brussels.

All four tools are read-only and return the API's JSON as both text and structured content.

Registry name: `io.github.snenenenenenene/stadiq` · npm: [`stadiq-mcp`](https://www.npmjs.com/package/stadiq-mcp)

## Tools

| Tool | What it returns |
| --- | --- |
| `stadiq_locations` | The saved locations on the account behind your API key, with ids and coordinates. |
| `stadiq_disruptions` | Road works within 2 km of a point and De Lijn disruptions affecting it, plus counts of active, planned and imminent works. |
| `stadiq_air_quality` | The latest NO2/PM reading from the nearest IRCELINE station, compared to WHO and EU limits, and whether the point is inside the Antwerp low-emission zone. |
| `stadiq_briefing` | A briefing for a point: risk level, key facts, the best and worst windows in the next 24 hours, and the next rush-hour NO2 peak. |

The location tools take either `locationId` (from `stadiq_locations`) or both `lat` and `lng`. Coordinates must be inside Flanders or Brussels.

## Install

You need Node.js 20 or newer and a Stadiq API key. Get a free developer key at [stadiq.app/developers](https://stadiq.app/developers).

### Claude Desktop, Cursor and other MCP clients

Add this to your client's MCP config (`claude_desktop_config.json`, `.cursor/mcp.json`, and so on):

```json
{
  "mcpServers": {
    "stadiq": {
      "command": "npx",
      "args": ["-y", "stadiq-mcp"],
      "env": { "STADIQ_API_KEY": "sq_live_..." }
    }
  }
}
```

### Claude Code

```sh
claude mcp add stadiq --env STADIQ_API_KEY=sq_live_... -- npx -y stadiq-mcp
```

## Configuration

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `STADIQ_API_KEY` | yes | | Your Stadiq API key (`sq_live_...`). |
| `STADIQ_BASE_URL` | no | `https://stadiq.app` | API host. |

## Develop

```sh
npm install
npm test                          # protocol smoke test
STADIQ_API_KEY=sq_live_... npm test   # plus one live briefing call
```

## Links

- [Stadiq](https://stadiq.app?utm_source=github&utm_medium=directory&utm_campaign=listing-2026-10)
- [API docs](https://stadiq.app/api-docs)
- [MCP setup guide](https://stadiq.app/developers/mcp)

## License

[MIT](LICENSE) © 2026 Okapi Works
