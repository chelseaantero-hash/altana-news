/**
 * Local: GET /api/news (RSS harvest) + static files.
 * Development UI: run `npm run dev` (Vite on :5173 proxies /api → this server on :3333).
 * Production-style: `npm run build` then `npm start` — serves ./dist SPA from this server.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { harvestAllFeeds } = require('./lib/harvest');

const PORT = Number(process.env.PORT) || 3333;
const ROOT = path.resolve(__dirname);
const DIST = path.join(ROOT, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function safeFileForUrl(urlPath) {
  const name = urlPath === '/' || urlPath === '' ? 'index.html' : String(urlPath).slice(1).replace(/\\/g, '/');
  if (!name || name.includes('..')) return null;
  const full = path.resolve(ROOT, name);
  if (!full.startsWith(ROOT)) return null;
  return full;
}

function distIndexExists() {
  try {
    return fs.existsSync(path.join(DIST, 'index.html'));
  } catch {
    return false;
  }
}

/** Resolve path for production build under ./dist (SPA fallback). */
function resolveDistPath(urlPath) {
  if (!distIndexExists()) return null;
  const rel = urlPath === '/' || urlPath === '' ? 'index.html' : String(urlPath).slice(1).replace(/\\/g, '/');
  if (!rel || rel.includes('..')) return null;
  const full = path.resolve(DIST, rel);
  if (!full.startsWith(DIST)) return null;
  if (fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  const hasExt = /\.[a-z0-9]+$/i.test(rel);
  if (!hasExt) return path.join(DIST, 'index.html');
  return null;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'GET' && u.pathname === '/api/news') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    try {
      const payload = await harvestAllFeeds();
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(JSON.stringify(payload));
    } catch (err) {
      console.error('[dev-server /api/news]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          error: 'Failed to load feeds',
          articles: [],
          updatedAt: null,
          harvestMeta: null,
        })
      );
    }
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  const filePath = resolveDistPath(u.pathname) || safeFileForUrl(u.pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  const hint = distIndexExists()
    ? 'serving ./dist + API'
    : 'no ./dist — run `npm run dev` for Vite UI, or `npm run build` then refresh';
  console.log(`Altana API + static: http://127.0.0.1:${PORT}/  (${hint})`);
});
