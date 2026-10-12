// Мінімальний статичний сервер без залежностей.
// /        → папка public (інтерфейс)
// /src/... → папка src (математика й геометрія, спільна з тестами)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function resolvePath(url) {
  const path = decodeURIComponent(new URL(url, 'http://x').pathname);
  const base = path.startsWith('/src/') ? ROOT : join(ROOT, 'public');
  const file = normalize(join(base, path === '/' ? 'index.html' : path));
  return file.startsWith(base) ? file : null; // захист від ../
}

createServer(async (req, res) => {
  const file = resolvePath(req.url);
  if (!file) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => {
  console.log(`ЛР №1 запущено: http://localhost:${PORT}`);
});
