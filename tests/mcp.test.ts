import { test, expect } from 'bun:test';

// Test MCP protocol compliance with SDK-based server
const BASE_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';

async function sendMCPRequest(request: any): Promise<any> {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return await response.json();
}

test('MCP: initialize handshake', async () => {
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
    },
  };

  const response = await sendMCPRequest(request);

  expect(response.jsonrpc).toBe('2.0');
  expect(response.id).toBe(1);
  expect(response.error).toBeUndefined();
  expect(response.result).toBeDefined();
  expect(response.result.protocolVersion).toBeDefined();
  expect(response.result.serverInfo).toBeDefined();
  expect(response.result.serverInfo.name).toBe('mcp-search-server');
});

test('MCP: tools/list returns available tools', async () => {
  const request = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
  };

  const response = await sendMCPRequest(request);

  expect(response.jsonrpc).toBe('2.0');
  expect(response.id).toBe(2);
  expect(response.error).toBeUndefined();
  expect(response.result).toBeDefined();
  expect(response.result.tools).toBeDefined();
  expect(Array.isArray(response.result.tools)).toBe(true);
  expect(response.result.tools.length).toBeGreaterThan(0);

  const searchTool = response.result.tools.find((t: any) => t.name === 'search_file');
  expect(searchTool).toBeDefined();
  expect(searchTool.description).toBeDefined();
  expect(searchTool.inputSchema).toBeDefined();
});

test('MCP: tools/call executes search_file tool', async () => {
  const request = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'search_file',
      arguments: {
        path: 'samples/sample.txt',
        keyword: 'keyword',
        options: {
          insensitive: true,
          context: 1,
        },
      },
    },
  };

  const response = await sendMCPRequest(request);

  expect(response.jsonrpc).toBe('2.0');
  expect(response.id).toBe(3);
  expect(response.error).toBeUndefined();
  expect(response.result).toBeDefined();
  expect(response.result.content).toBeDefined();
  expect(Array.isArray(response.result.content)).toBe(true);
  expect(response.result.content[0].type).toBe('text');

  // Parse the text content
  const resultData = JSON.parse(response.result.content[0].text);
  expect(resultData.matches).toBeDefined();
  expect(Array.isArray(resultData.matches)).toBe(true);
  expect(resultData.meta).toBeDefined();
});

test('MCP: invalid method returns error', async () => {
  const request = {
    jsonrpc: '2.0',
    id: 4,
    method: 'invalid_method',
  };

  const response = await sendMCPRequest(request);

  expect(response.jsonrpc).toBe('2.0');
  expect(response.id).toBe(4);
  expect(response.error).toBeDefined();
  expect(response.error?.code).toBe(-32601); // Method not found
  expect(response.result).toBeUndefined();
});


