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
    // Validate inputs
    if (!path || typeof path !== 'string') {
      throw new Error('path is required and must be a string');
    }

    if (!keyword || typeof keyword !== 'string') {
      throw new Error('keyword is required and must be a string');
    }

    if (keyword.length === 0) {
      throw new Error('keyword cannot be empty');
    }

    // Build search options
    // Use WORKSPACE_ROOT env var if set, otherwise fall back to process.cwd()
    const workspaceRoot = process.env.WORKSPACE_ROOT || process.cwd();
    const searchOptions: SearchOptions = {
      workspaceRoot,
    };

    if (options.regex !== undefined) {
      searchOptions.regex = options.regex;
    }

    if (options.insensitive !== undefined) {
      searchOptions.insensitive = options.insensitive;
    }

    if (options.context !== undefined) {
      searchOptions.context = options.context;
    }

    if (options.maxResults !== undefined) {
      searchOptions.maxResults = options.maxResults;
    }

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
  app.use(express.json());

  const port = parseInt(process.env.PORT || '3000');

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
