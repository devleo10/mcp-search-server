# MCP Search Server (TypeScript + Bun)

**Proper MCP (Model Context Protocol) Server** implementing JSON-RPC 2.0 with file search capabilities.

## What is MCP?

MCP is a protocol that connects:
- **Client** (contains AI model like Claude Desktop, Cursor) ↔ **Server** (provides tools - this server)

**Your server provides tools that AI models can use.** The model itself is in the client application.

## Architecture

```
┌─────────────────────────────┐
│  MCP CLIENT                 │
│  - Contains AI Model        │
│  - Makes tool requests      │
└─────────────────────────────┘
          ↕ JSON-RPC 2.0
┌─────────────────────────────┐
│  MCP SERVER (This Project)  │
│  - Provides search_file tool │
│  - Returns context/results   │
└─────────────────────────────┘
```

## MCP Protocol Features

✅ **Official SDK** - Uses `@modelcontextprotocol/sdk` v1.21.0  
✅ **JSON-RPC 2.0** - Proper protocol implementation via SDK  
✅ **initialize** - Handshake method (automatic)  
✅ **tools/list** - Lists available tools (automatic)  
✅ **tools/call** - Executes tools (automatic)  
✅ **Streamable HTTP Transport** - Web-based communication  
✅ **stdio Transport** - Standard input/output  

## Quick Start

### Install Dependencies

```powershell
bun install
```

### Start MCP Server (HTTP Mode)

```powershell
bun run start
```

Server runs on `http://localhost:3000/mcp` (Streamable HTTP endpoint)

### Start MCP Server (stdio Mode)

```powershell
$env:MCP_TRANSPORT="stdio"
bun run start
```

## Using the MCP Server

### Method 1: MCP Protocol (JSON-RPC 2.0)

#### Initialize Handshake

```powershell
$request = @{
    jsonrpc = "2.0"
    id = 1
    method = "initialize"
    params = @{
        protocolVersion = "2024-11-05"
        capabilities = @{}
        clientInfo = @{
            name = "test-client"
            version = "1.0.0"
        }
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/mcp -Method POST -Body $request -ContentType 'application/json'
```

#### List Available Tools

```powershell
$request = @{
    jsonrpc = "2.0"
    id = 2
    method = "tools/list"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/mcp -Method POST -Body $request -ContentType 'application/json'
```

#### Call Search Tool

```powershell
$request = @{
    jsonrpc = "2.0"
    id = 3
    method = "tools/call"
    params = @{
        name = "search_file"
        arguments = @{
            path = "samples/sample.txt"
            keyword = "keyword"
            options = @{
                insensitive = $true
                context = 2
            }
        }
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/mcp -Method POST -Body $request -ContentType 'application/json'
```

### Method 2: CLI Tool (Direct Usage)

```powershell
bun run cli -- samples/sample.txt keyword -i -c 2
```

## Testing

### Run All Tests

```powershell
bun test
```

### Run MCP Protocol Tests

```powershell
# Start server first in another terminal
bun run start

# Then run MCP tests
bun test tests/mcp.test.ts
```

## Connecting to MCP Clients

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "search-server": {
      "command": "bun",
      "args": ["run", "src/server.ts"],
      "env": {
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### Cursor IDE

Configure MCP server settings to connect to your server.

## Response Format

MCP tools return responses in this format:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"matches\":[...],\"meta\":{...}}"
      }
    ],
    "isError": false
  }
}
```

## Where is the Model?

**The AI model is NOT in this server.** It's in the **MCP client** (Claude Desktop, Cursor, etc.).

This server:
- ✅ Provides tools (search_file)
- ✅ Implements MCP protocol
- ✅ Returns context/data
- ❌ Does NOT contain the model (that's correct!)

## Protocol Implementation

| Component | Status | Location |
|-----------|--------|----------|
| Official MCP SDK | ✅ | `@modelcontextprotocol/sdk` v1.21.0 |
| McpServer | ✅ | `src/server.ts` |
| Tool Registration | ✅ | `server.registerTool()` |
| Stdio Transport | ✅ | `StdioServerTransport` |
| Streamable HTTP Transport | ✅ | `StreamableHTTPServerTransport` |

See `MCP-ARCHITECTURE.md` for detailed explanation.
