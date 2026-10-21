import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const distDir = path.resolve('dist');
const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const spaRegex = new RegExp('^' + vercelConfig.rewrites[0].source + '$');

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(distDir, urlPath);

  // If path matches SPA rewrite regex or file doesn't exist, route according to vercel.json
  if (spaRegex.test(urlPath) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(0, async () => {
  const port = server.address().port;
  console.log(`Production simulation server listening on :${port}`);
  const endpoints = [
    { path: '/', expectedType: 'text/html', typeCheck: 'text' },
    { path: '/manifest.webmanifest', expectedType: 'application/manifest+json', typeCheck: 'json' },
    { path: '/sw.js', expectedType: 'application/javascript', typeCheck: 'js' },
    { path: '/icon-192.png', expectedType: 'image/png', typeCheck: 'png' },
    { path: '/icon-512.png', expectedType: 'image/png', typeCheck: 'png' },
    { path: '/admin', expectedType: 'text/html', typeCheck: 'text' },
    { path: '/admin/login', expectedType: 'text/html', typeCheck: 'text' }
  ];

  let allPassed = true;
  for (const ep of endpoints) {
    try {
      const res = await fetch(`http://localhost:${port}` + ep.path);
      const ct = res.headers.get('content-type') || '';
      const okType = ct.includes(ep.expectedType);
      const buf = Buffer.from(await res.arrayBuffer());
      let bodyOk = false;

      if (ep.typeCheck === 'text') {
        const str = buf.toString('utf8');
        bodyOk = str.includes('<div id="root">') && str.includes('<!doctype html');
      } else if (ep.typeCheck === 'json') {
        const obj = JSON.parse(buf.toString('utf8'));
        bodyOk = obj.name && obj.start_url === '/admin';
      } else if (ep.typeCheck === 'js') {
        const str = buf.toString('utf8');
        bodyOk = str.includes("self.addEventListener('fetch'") && !str.startsWith('<!doctype');
      } else if (ep.typeCheck === 'png') {
        bodyOk = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
      }

      const pass = res.status === 200 && okType && bodyOk;
      console.log(`Endpoint ${ep.path.padEnd(24)}: ${pass ? 'PASS' : 'FAIL'} | Status: ${res.status} | Content-Type: ${ct.padEnd(30)} | BodyValid: ${bodyOk}`);
      if (!pass) allPassed = false;
    } catch (e) {
      console.error(`Endpoint ${ep.path}: ERROR`, e);
      allPassed = false;
    }
  }

  server.close(() => {
    console.log('--- Result:', allPassed ? 'ALL PASS' : 'FAILURES OCCURRED ---');
    if (!allPassed) {
      process.exitCode = 1;
    }
  });
});
