import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';
import { searchFile } from './search.js';
import type { SearchOptions } from './search.js';

// Create MCP Server instance
const server = new McpServer({
  name: 'mcp-search-server',
  version: '1.0.0',
});

// Register search_file tool
server.registerTool(
  'search_file',
  {
    title: 'File Search',
    description: 'Search for a keyword or pattern within a file. Returns matching lines with optional context.',
    inputSchema: {
      path: z.string(),
      keyword: z.string(),
      options: z
        .object({
          regex: z.boolean().optional().default(false),
          insensitive: z.boolean().optional().default(false),
          context: z.number().int().min(0).max(100).optional().default(0),
          maxResults: z.number().int().min(1).max(100000).optional().default(1000),
        })
        .optional()
        .default(() => ({})),
    },
    // outputSchema is optional - SDK will infer from return type
  },
  async ({ path, keyword, options = {} }) => {
    // Zod schema already validates inputs, so we can trust the types here
    // Build search options
    // Use WORKSPACE_ROOT env var if set, otherwise fall back to process.cwd()
    const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();
    const searchOptions: SearchOptions = {
      workspaceRoot,
      ...(options.regex !== undefined && { regex: options.regex }),
      ...(options.insensitive !== undefined && { insensitive: options.insensitive }),
      ...(options.context !== undefined && { context: options.context }),
      ...(options.maxResults !== undefined && { maxResults: options.maxResults }),
    };

    // Execute search
    const start = Date.now();
    const matches = await searchFile(path, keyword, searchOptions);
    const durationMs = Date.now() - start;

    const result = {
      matches,
      meta: {
        path,
        keyword,
        count: matches.length,
        durationMs,
      },
    };

    // Return results in MCP format
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Start server based on transport mode
const transportMode = process.env.MCP_TRANSPORT || 'http';

if (transportMode === 'stdio') {
  // Stdio transport (for MCP clients like Claude Desktop)
  const transport = new StdioServerTransport();
  server.connect(transport);
  console.error('MCP Search Server running in stdio mode');
} else {
  // HTTP/Streamable HTTP transport
  const app = express();
  // Ensure Accept header is compatible for Streamable HTTP before any handlers
  app.use('/mcp', (req, _res, next) => {
    const acceptHeader = req.headers['accept'];
    if (!acceptHeader || (typeof acceptHeader === 'string' && !acceptHeader.includes('text/event-stream'))) {
      req.headers['accept'] = 'application/json, text/event-stream';
    }
    next();
  });
  app.use(express.json());

  const portEnv = process.env.PORT || '3000';
  const port = parseInt(portEnv, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    console.error(`Error: Invalid port number: ${portEnv}`);
    process.exit(1);
  }

  app.post('/mcp', async (req: express.Request, res: express.Response) => {
    // Create a new transport for each request to prevent request ID collisions
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.listen(port, () => {
    console.log(`MCP Search Server running on http://localhost:${port}/mcp`);
    console.log(`Connect with: http://localhost:${port}/mcp`);
  }).on('error', (error: Error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
