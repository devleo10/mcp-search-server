# MCP Search Server

A minimal, fast Model Context Protocol (MCP) server that exposes a single tool: `search_file` for searching within files. Designed to work with Cursor and Claude Desktop, plus a small CLI for direct use.

**Repository**: [https://github.com/devleo10/mcp-search-server](https://github.com/devleo10/mcp-search-server)

## Tech stack

- Bun (runtime + package manager)
- TypeScript
- `@modelcontextprotocol/sdk` v1.21.0 (official MCP SDK)
- Express 5 (HTTP mode)
- JSON-RPC 2.0 (protocol)

## What this is (and isn’t)

- Is: an MCP server that returns context/results from a file search tool
- Isn’t: a model/LLM. The model lives in the MCP client (Cursor, Claude)

## Install

```bash
bun install
```

## Run

HTTP mode (default):
```bash
bun run start   # http://localhost:3000/mcp
```

stdio mode (for Cursor/Claude):
```bash
export MCP_TRANSPORT=stdio        # macOS/Linux
$env:MCP_TRANSPORT="stdio"       # Windows PowerShell
bun run start
```

Optional: restrict file access to a workspace root
```bash
export WORKSPACE_ROOT=/path/to/project
```

## Use in Cursor (recommended)

1) Create or edit your MCP config
- Windows: `%APPDATA%\Cursor\mcp.json`
- macOS: `~/.cursor/mcp.json`
- Linux: `~/.config/Cursor/mcp.json`

2) Add the server
```json
{
  "mcpServers": {
    "search-server": {
      "command": "bun",
      "args": ["run", "D:\\WEBD\\mcp-search-server\\src\\server.ts"],
      "cwd": "D:\\WEBD\\mcp-search-server",
      "env": {
        "MCP_TRANSPORT": "stdio",
        "WORKSPACE_ROOT": "D:\\WEBD\\mcp-search-server"
      }
    }
  }
}
```

3) Restart Cursor and ask:
- “What MCP tools are available?” → should list `search_file`
- “Search for ‘keyword’ in `samples/sample.txt` with 2 lines of context”

Tips
- Use paths relative to `WORKSPACE_ROOT`
- Ask for context: “with 2 lines of context”

## CLI usage (direct, no MCP)

```bash
# basic
bun run cli -- samples/sample.txt keyword

# case-insensitive with context
bun run cli -- samples/sample.txt keyword -i -c 2

# regex
bun run cli -- samples/sample.txt "function.*\(" -r
```

Options
- `-r, --regex` enable regex
- `-i, --insensitive` case-insensitive
- `-c N, --context N` context lines (0–100)
- `-m N, --max N` max results (1–100000)

## MCP Inspector Demo

Here's how to test the tool using MCP Inspector:

1. **Install MCP Inspector** (if not already installed):
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. **Start your server**:
   ```bash
   bun run start
   ```

3. **Run MCP Inspector**:
   ```bash
   mcp-inspector http://localhost:3000/mcp
   ```

4. **Test the tool**:
   - Select `search_file` from the tools list
   - Use this sample input:
     ```json
     {
       "path": "samples/sample.txt",
       "keyword": "keyword",
       "options": {
         "insensitive": true,
         "context": 2
       }
     }
     ```
   - Click "Call Tool" to see the results

![MCP Inspector Screenshot](docs/mcp-inspector-screenshot.png)

*Note: Add a screenshot showing the MCP Inspector interface with the tool call and results*

## Tool API (search_file)

Input
```json
{
  "path": "samples/sample.txt",
  "keyword": "keyword",
  "options": {
    "regex": false,
    "insensitive": true,
    "context": 2,
    "maxResults": 1000
  }
}
```

Output (content[0].text contains JSON)
```json
{
  "matches": [ { "line": 13, "text": "..." } ],
  "meta": { "path": "samples/sample.txt", "keyword": "keyword", "count": 1, "durationMs": 5 }
}
```

## Test

```bash
bun test
```

## Project layout

```
src/
  server.ts   # MCP server + transport
  search.ts   # search engine (streaming + in-memory)
bin/
  search-cli.ts
samples/
tests/
```

## Troubleshooting

- “File not found” → use paths inside `WORKSPACE_ROOT` and relative to it
- “Access denied: Path must be within workspace root” → fix `WORKSPACE_ROOT`
- Cursor doesn’t show tools → restart Cursor, check MCP logs (View → Output → MCP)

License: MIT
