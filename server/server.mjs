// 3D Print Calculator – Webserver für den Docker-Betrieb.
// Liefert die gebaute Oberfläche aus und speichert Stammdaten in SQLite.
// Keine externen Abhängigkeiten: nutzt node:http und node:sqlite (Node 22.13+ / 24).
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = process.env.DIST_DIR || join(ROOT, 'dist');
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');
const PORT = Number(process.env.PORT || 8080);
const MAX_BODY = 4 * 1024 * 1024; // Logo als Data-URL passt bequem hinein
const VERSION = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')).version;

await mkdir(DATA_DIR, { recursive: true });
const db = new DatabaseSync(join(DATA_DIR, 'calculator.db'));
db.exec(`PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);`);
const getKv = db.prepare('SELECT value, updated_at FROM kv WHERE key = ?');
const putKv = db.prepare(`INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}
const json = (res, status, obj) => send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Daten zu groß'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function api(req, res, path) {
  if (path === '/api/health') return json(res, 200, { ok: true, version: VERSION });
  if (path !== '/api/data') return json(res, 404, { error: 'Nicht gefunden' });
  if (req.method === 'GET') {
    const row = getKv.get('data');
    if (!row) return send(res, 204, '', { 'Cache-Control': 'no-store' });
    return send(res, 200, row.value, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Last-Modified': new Date(row.updated_at).toUTCString() });
  }
  if (req.method === 'PUT') {
    let data;
    try { data = JSON.parse(await readBody(req)); } catch (e) { return json(res, e.status || 400, { error: e.status ? e.message : 'Ungültiges JSON' }); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json(res, 400, { error: 'Objekt erwartet' });
    putKv.run('data', JSON.stringify(data), new Date().toISOString());
    return json(res, 200, { ok: true });
  }
  return json(res, 405, { error: 'Methode nicht erlaubt' });
}

async function staticFile(res, path) {
  let file = normalize(join(DIST, decodeURIComponent(path)));
  if (file !== DIST && !file.startsWith(DIST + sep)) return send(res, 403, 'Forbidden');
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); }
  catch { file = join(DIST, 'index.html'); } // SPA-Fallback
  try {
    const body = await readFile(file);
    const cache = file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache';
    send(res, 200, body, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': cache });
  } catch { send(res, 404, 'Not found'); }
}

const server = http.createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://x').pathname;
    // Unterpfade (z. B. /calculator/api/data hinter einem Reverse Proxy) ebenfalls bedienen
    const apiIdx = path.indexOf('/api/');
    if (apiIdx !== -1) return await api(req, res, path.slice(apiIdx));
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method not allowed');
    return await staticFile(res, path);
  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'Serverfehler' });
  }
});

server.listen(PORT, () => console.log(`3D Print Calculator ${VERSION} läuft auf Port ${PORT} (Daten: ${DATA_DIR})`));
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { server.close(); db.close(); process.exit(0); });
