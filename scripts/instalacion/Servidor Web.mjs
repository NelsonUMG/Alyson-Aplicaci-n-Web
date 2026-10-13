import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend');
const port = Number(process.env.PUERTO_WEB || 5173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2'};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    const upstream = http.request({hostname:'127.0.0.1',port:8080,path:req.url,method:req.method,
      headers:{...req.headers,'x-forwarded-host':req.headers.host,'x-forwarded-proto':'http'}}, response => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(503, {'content-type':'application/json'}); res.end('{"detail":"El servidor no está disponible."}'); });
    req.on('aborted', () => upstream.destroy()); req.pipe(upstream); return;
  }
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  let relative;
  try { relative = decodeURIComponent(url.pathname); } catch { res.writeHead(400); res.end(); return; }
  let target = path.resolve(root, '.' + relative);
  if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403); res.end(); return; }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    if (path.extname(relative)) { res.writeHead(404); res.end(); return; }
    target = path.join(root, 'index.html');
  }
  const stat = fs.statSync(target);
  res.writeHead(200, {'content-type':mime[path.extname(target)] || 'application/octet-stream','content-length':stat.size,
    'x-content-type-options':'nosniff','cache-control':target.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600'});
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(target).on('error', () => res.destroy()).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`Sistema web disponible en http://127.0.0.1:${port}`));
