# MCP Search Server

A **Model Context Protocol (MCP) server** that provides file search capabilities to AI assistants like Claude Desktop and Cursor. Search files for keywords, patterns, or regular expressions with context lines and flexible options.

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager
- **Language**: TypeScript - Type-safe JavaScript
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.21.0 - Official MCP protocol implementation
- **HTTP Server**: Express v5.1.0 - Web server for HTTP transport mode
- **Protocol**: JSON-RPC 2.0 - Standard RPC protocol used by MCP

## What is MCP?

**Model Context Protocol** connects AI clients (like Claude Desktop, Cursor) with servers that provide tools and resources:

```
AI Client (Claude Desktop, Cursor)
    ↕ JSON-RPC 2.0
MCP Server (this project - provides search_file tool)
    ↕
File System (searches files)
```

**Important**: The AI model runs in the client, not in this server. This server only provides the `search_file` tool.

## Features

- ✅ **Full-text search** - Search for keywords or patterns in files
- ✅ **Regular expressions** - Advanced pattern matching with regex
- ✅ **Case-insensitive search** - Optional case-insensitive matching
- ✅ **Context lines** - Include surrounding lines (0-100 lines) around matches
- ✅ **Large file support** - Streaming for files >10MB, in-memory for smaller files
- ✅ **Security** - Path validation and workspace root restrictions
- ✅ **Binary detection** - Automatically skips binary files
- ✅ **Dual transport** - HTTP (for web clients) and stdio (for desktop apps)

## Installation

### Prerequisites

- [Bun](https://bun.sh/) installed (v1.0+)

### Setup

```bash
# Clone or navigate to project directory
cd mcp-search-server

# Install dependencies
bun install
```

## Usage

### Method 1: MCP Server (for AI Clients)

#### Start Server (HTTP Mode)

```bash
bun run start
```

Server runs on `http://localhost:3000/mcp`

#### Start Server (stdio Mode - for Claude Desktop/Cursor)

```bash
# Set environment variable
export MCP_TRANSPORT=stdio  # Linux/Mac
$env:MCP_TRANSPORT="stdio"  # PowerShell

# Start server
bun run start
```

#### Setup MCP in Cursor IDE

##### Step 1: Locate MCP Configuration File

**Windows:**
- Path: `%APPDATA%\Cursor\mcp.json` (typically `C:\Users\<YourUsername>\AppData\Roaming\Cursor\mcp.json`)
- Open PowerShell and run: `code $env:APPDATA\Cursor\mcp.json`

**macOS:**
- Path: `~/.cursor/mcp.json`
- Open Terminal and run: `code ~/.cursor/mcp.json`

**Linux:**
- Path: `~/.config/Cursor/mcp.json`
- Open Terminal and run: `code ~/.config/Cursor/mcp.json`

**Note**: If the file doesn't exist, create it with the structure below.

##### Step 2: Add Server Configuration

Open `mcp.json` and add/update the configuration:

```json
{
  "mcpServers": {
    "search-server": {
      "command": "C:\\Users\\CHOUDHURY\\.bun\\bin\\bun.exe",
      "args": ["D:\\WEBD\\mcp-search-server\\src\\server.ts"],
      "cwd": "D:\\WEBD\\mcp-search-server",
      "env": {
        "MCP_TRANSPORT": "stdio",
        "WORKSPACE_ROOT": "D:\\WEBD\\mcp-search-server"
      }
    }
  }
}
```

**Important Configuration Notes:**
- `command`: Full path to `bun.exe` (or `bun` if in PATH)
  - Windows: `C:\\Users\\<YourUsername>\\.bun\\bin\\bun.exe`
  - macOS/Linux: `bun` (if installed globally) or full path to binary
- `args`: Path to `src/server.ts` (use absolute path)
- `cwd`: Project root directory (must match `WORKSPACE_ROOT`)
- `WORKSPACE_ROOT`: Directory where your files are located (paths will be relative to this)

##### Step 3: Restart Cursor

After saving `mcp.json`, **restart Cursor completely** to load the MCP server.

##### Step 4: Verify MCP Connection

1. Open Cursor and start a chat session
2. Check if MCP tools are available by asking: *"What MCP tools are available?"*
3. You should see `search_file` listed as an available tool

#### Using MCP Search in Cursor

Once configured, you can use the search tool in your Cursor chat:

**Example Prompts:**

1. **Basic Search:**
   ```
   Search for "function" in src/server.ts
   ```

2. **Case-Insensitive Search:**
   ```
   Find all occurrences of "keyword" (case-insensitive) in samples/sample.txt with 2 lines of context
   ```

3. **Regex Search:**
   ```
   Search for function definitions using regex pattern "function.*\(" in src/search.ts
   ```

4. **Multi-file Search:**
   ```
   Search for "export" in all TypeScript files in the src directory
   ```

**How It Works:**

- Cursor's AI automatically calls the `search_file` tool when you ask to search files
- The tool searches files within your `WORKSPACE_ROOT` directory
- Results include line numbers and optional context lines
- The AI uses search results to answer your questions

**Tips:**
- Be specific about file paths (relative to workspace root)
- Request context lines for better understanding: *"with 3 lines of context"*
- Use natural language - Cursor will translate to tool calls automatically
- Check Cursor's MCP logs if tools aren't working (View → Output → MCP)

#### Configure Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "search-server": {
      "command": "bun",
      "args": ["run", "/path/to/mcp-search-server/src/server.ts"],
      "cwd": "/path/to/mcp-search-server",
      "env": {
        "MCP_TRANSPORT": "stdio",
        "WORKSPACE_ROOT": "/path/to/mcp-search-server"
      }
    }
  }
}
```

### Method 2: CLI Tool (Direct Usage)

Search files directly without MCP:

```bash
# Basic search
bun run cli -- samples/sample.txt keyword

# Case-insensitive search with context
bun run cli -- samples/sample.txt keyword -i -c 2

# Regex search
bun run cli -- samples/sample.txt "function.*\(" -r

# Limit results
bun run cli -- samples/sample.txt keyword -m 10
```

#### CLI Options

- `--regex` or `-r` - Enable regular expression matching
- `--insensitive` or `-i` - Case-insensitive search
- `--context N` or `-c N` - Show N lines before/after matches (0-100)
- `--max N` or `-m N` - Maximum results to return (1-100000)

## Search Tool API

The `search_file` tool accepts:

```typescript
{
  path: string;           // File path (relative to workspace root)
  keyword: string;        // Search term or regex pattern
  options?: {
    regex?: boolean;      // Enable regex (default: false)
    insensitive?: boolean; // Case-insensitive (default: false)
    context?: number;     // Context lines (0-100, default: 0)
    maxResults?: number;  // Max results (1-100000, default: 1000)
  }
}
```

Returns matches with line numbers and optional context:

```json
{
  "matches": [
    {
      "line": 13,
      "text": "keyword appears multiple times in this file.",
      "pre": ["Line 11", "Line 12"],
      "post": ["Line 14", "Line 15"]
    }
  ],
  "meta": {
    "path": "samples/sample.txt",
    "keyword": "keyword",
    "count": 1,
    "durationMs": 5
  }
}
```

## Examples

### Example 1: Search for function definitions

```bash
bun run cli -- src/server.ts "function.*\(" -r -c 3
```

### Example 2: Case-insensitive keyword search

```bash
bun run cli -- samples/sample.txt keyword -i -c 2
```

### Example 3: Find all numbers

```bash
bun run cli -- src/search.ts "\d+" -r
```

## Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/search.test.ts
```

## Project Structure

```
mcp-search-server/
├── src/
│   ├── server.ts      # MCP server implementation
│   ├── search.ts      # Core search functionality
│   └── types/         # TypeScript type definitions
├── bin/
│   └── search-cli.ts  # CLI tool
├── tests/             # Test files
├── samples/           # Sample files for testing
└── package.json       # Dependencies and scripts
```

## Limitations

- Maximum file size: 100MB (configurable)
- Binary files are automatically skipped
- Paths must be within the workspace root (security feature)
- Streaming mode doesn't support post-context for very large files

## Troubleshooting

### General Issues

**Path not found errors**: Ensure the server is running from the correct directory or set `WORKSPACE_ROOT` environment variable.

**MCP connection issues**: Restart Cursor/Claude Desktop after changing MCP configuration.

**Port already in use**: Change the port via `PORT` environment variable: `PORT=3001 bun run start`

### Cursor-Specific Issues

**MCP server not connecting:**
1. Verify `mcp.json` syntax is valid JSON (use a JSON validator)
2. Check that `bun.exe` path is correct (Windows: use double backslashes `\\`)
3. Ensure `WORKSPACE_ROOT` matches your actual project directory
4. Restart Cursor completely (not just reload window)
5. Check MCP logs: View → Output → Select "MCP" from dropdown

**Tools not appearing in chat:**
- Ask Cursor: *"What tools are available?"* to see if MCP tools are loaded
- Check if server started successfully in MCP logs
- Verify `MCP_TRANSPORT=stdio` is set in environment variables

**Search returns "File not found":**
- File paths must be relative to `WORKSPACE_ROOT`
- Example: If `WORKSPACE_ROOT` is `D:\WEBD\mcp-search-server`, use `samples/sample.txt` not `D:\WEBD\mcp-search-server\samples\sample.txt`
- Ensure file exists within workspace root directory

**"Access denied: Path must be within workspace root":**
- Verify `WORKSPACE_ROOT` environment variable matches your `cwd` in `mcp.json`
- Paths outside the workspace root are blocked for security

**Server crashes or errors:**
- Check Bun is installed: `bun --version`
- Verify TypeScript files compile: `bun run src/server.ts`
- Check MCP logs for detailed error messages

## License

MIT
