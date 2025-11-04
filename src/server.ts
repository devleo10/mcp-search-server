import { searchFile } from './search';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

// Configuration
const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB max request body
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Parse and validate request body
 */
async function parseRequestBody(req: Request): Promise<any> {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Content-Type must be application/json');
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
    throw new Error(`Request body too large: ${contentLength} bytes (max: ${MAX_REQUEST_SIZE} bytes)`);
  }

  const body = await req.json().catch(() => {
    throw new Error('Invalid JSON in request body');
  });

  return body;
}

/**
 * Validate search request parameters
 */
function validateSearchRequest(body: any): { path: string; keyword: string; options: any } {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const { path, keyword, options } = body;

  if (!path || typeof path !== 'string') {
    throw new Error('path is required and must be a string');
  }

  if (!keyword || typeof keyword !== 'string') {
    throw new Error('keyword is required and must be a string');
  }

  if (keyword.length === 0) {
    throw new Error('keyword cannot be empty');
  }

  if (keyword.length > 10000) {
    throw new Error('keyword too long (max: 10000 characters)');
  }

  // Validate options if provided
  if (options !== undefined) {
    if (typeof options !== 'object' || Array.isArray(options)) {
      throw new Error('options must be an object');
    }

    const validOptions: any = {};
    if (options.regex !== undefined) {
      if (typeof options.regex !== 'boolean') {
        throw new Error('options.regex must be a boolean');
      }
      validOptions.regex = options.regex;
    }

    if (options.insensitive !== undefined) {
      if (typeof options.insensitive !== 'boolean') {
        throw new Error('options.insensitive must be a boolean');
      }
      validOptions.insensitive = options.insensitive;
    }

    if (options.context !== undefined) {
      const context = Number(options.context);
      if (isNaN(context) || context < 0 || context > 100) {
        throw new Error('options.context must be a number between 0 and 100');
      }
      validOptions.context = context;
    }

    if (options.maxResults !== undefined) {
      const maxResults = Number(options.maxResults);
      if (isNaN(maxResults) || maxResults < 1 || maxResults > 100000) {
        throw new Error('options.maxResults must be a number between 1 and 100000');
      }
      validOptions.maxResults = maxResults;
    }

    return { path, keyword, options: validOptions };
  }

  return { path, keyword, options: {} };
}

/**
 * Classify error and return appropriate HTTP status code
 */
function classifyError(error: Error): { status: number; message: string } {
  const msg = error.message.toLowerCase();

  // Client errors (4xx)
  if (msg.includes('required') || msg.includes('invalid') || msg.includes('must be')) {
    return { status: 400, message: error.message };
  }

  if (msg.includes('not found') || msg.includes('enoent')) {
    return { status: 404, message: error.message };
  }

  if (msg.includes('permission denied') || msg.includes('access denied') || msg.includes('eacces')) {
    return { status: 403, message: error.message };
  }

  if (msg.includes('too large') || msg.includes('too long')) {
    return { status: 413, message: error.message };
  }

  // Server errors (5xx)
  return { status: 500, message: error.message };
}

/**
 * Handle search request with timeout
 */
async function handleSearchRequest(body: any): Promise<Response> {
  return Promise.race([
    (async () => {
      const { path, keyword, options } = validateSearchRequest(body);
      
      // Add workspace root for security (defaults to current working directory)
      const searchOptions = {
        ...options,
        workspaceRoot: process.cwd()
      };

      const start = Date.now();
      const matches = await searchFile(path, keyword, searchOptions);
      const durationMs = Date.now() - start;

      const resp = {
        matches,
        meta: {
          path,
          keyword,
          count: matches.length,
          durationMs
        }
      };

      return new Response(JSON.stringify(resp), {
        status: 200,
        headers: defaultHeaders
      });
    })(),
    new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT)
    )
  ]);
}

Bun.serve({
  port: 3000,
  async fetch(req: Request) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: defaultHeaders });
    }

    const url = new URL(req.url);

    // Handle POST /search
    if (req.method === 'POST' && url.pathname === '/search') {
      try {
        const body = await parseRequestBody(req);
        return await handleSearchRequest(body);
      } catch (err: any) {
        const error = err instanceof Error ? err : new Error(String(err));
        const { status, message } = classifyError(error);
        
        return new Response(
          JSON.stringify({ error: message }),
          {
            status,
            headers: defaultHeaders
          }
        );
      }
    }

    // Handle 404 for unknown routes
    return new Response(
      JSON.stringify({ error: 'Not Found' }),
      {
        status: 404,
        headers: defaultHeaders
      }
    );
  }
});

console.log('MCP Search Server running on http://localhost:3000');
