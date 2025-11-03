import { searchFile } from './search';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

Bun.serve({
  port: 3000,
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: defaultHeaders });
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/search') {
      try {
        const body = await req.json().catch(() => ({})) as any;
        const { path, keyword, options } = body;
        if (!path || !keyword) return new Response(JSON.stringify({ error: 'path and keyword required' }), { status: 400, headers: defaultHeaders });
        const start = Date.now();
        const matches = await searchFile(path, keyword, options || {});
        const durationMs = Date.now() - start;
        const resp = { matches, meta: { path, keyword, count: matches.length, durationMs } };
        return new Response(JSON.stringify(resp), { status: 200, headers: defaultHeaders });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: defaultHeaders });
      }
    }
    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: defaultHeaders });
  }
});
