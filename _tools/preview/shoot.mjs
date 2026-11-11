// Render the real client.js in a bare page and screenshot it, so the README
// images always match the shipped panel. Chrome is driven over its headless
// CLI; nothing here runs inside DSH.
//
//   node _tools/preview/shoot.mjs            -> screenshots/*.png
//   node _tools/preview/shoot.mjs --serve    -> just serve the preview on :5199
//
// Needs React 18 UMD in _tools/preview/vendor/ (see README of this folder).
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(HERE, '..', '..');
const VENDOR = resolve(HERE, 'vendor');
const OUT = resolve(ROOT, 'screenshots');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const CHROME = process.env.CHROME_PATH
  || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

/** Map a request path onto a file, refusing anything outside the allowed roots. */
async function resolveFile(urlPath) {
  const pathname = decodeURIComponent(urlPath.split('?')[0]);
  const routes = [
    [/^\/plugins\/liang-backdrop\/frames\/(frame-\d{2}\.webp)$/, (m) => join(ROOT, 'assets', 'frames', m[1])],
    [/^\/vendor\/([\w.-]+)$/, (m) => join(VENDOR, m[1])],
    [/^\/client\.js$/, () => join(ROOT, 'client.js')],
    [/^\/$/, () => join(HERE, 'index.html')],
  ];
  for (const [pattern, map] of routes) {
    const match = pattern.exec(pathname);
    if (match) return map(match);
  }
  return null;
}

function serve() {
  return new Promise((done) => {
    const server = createServer(async (req, res) => {
      const file = await resolveFile(req.url || '/');
      if (!file || (!file.startsWith(ROOT) && !file.startsWith(VENDOR))) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
        return;
      }
      try {
        const body = await readFile(file);
        res.writeHead(200, {
          'Content-Type': MIME[extname(file)] || 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        res.end(body);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
      }
    });
    server.listen(5199, '127.0.0.1', () => done(server));
  });
}

function shoot(url, file, { width = 720, height = 540, scale = 2 } = {}) {
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--force-device-scale-factor=${scale}`,
    `--window-size=${width},${height}`,
    '--virtual-time-budget=8000',
    `--user-data-dir=${join(tmpdir(), 'lb-preview-profile')}`,
    `--screenshot=${file}`,
    url,
  ];
  return new Promise((done, fail) => {
    const child = spawn(CHROME, args, { stdio: 'ignore' });
    child.on('error', fail);
    child.on('exit', (code) => (code === 0 ? done() : fail(new Error(`chrome exited ${code}`))));
  });
}

const server = await serve();
const base = 'http://127.0.0.1:5199';

if (process.argv.includes('--serve')) {
  console.log(`preview: ${base}/?lang=zh   (Ctrl+C to stop)`);
} else {
  // `name=url` pairs override the default shot list, `--out=<dir>` the target.
  const outArg = process.argv.find((arg) => arg.startsWith('--out='));
  const outDir = outArg ? resolve(outArg.slice('--out='.length)) : OUT;
  const pairs = process.argv.slice(2).filter((arg) => arg.includes('=') && !arg.startsWith('--'));
  const shots = pairs.length
    ? pairs.map((pair) => [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)])
    : [
      ['panel-zh.png', `${base}/?lang=zh&system=en&level=3`],
      ['panel-en.png', `${base}/?lang=en&system=zh&level=3`],
    ];

  await mkdir(outDir, { recursive: true });
  for (const [name, url] of shots) {
    const file = join(outDir, name);
    await shoot(url, file);
    const info = await stat(file);
    console.log(`${name}  ${Math.round(info.size / 1024)} KB  ${url}`);
  }
  server.close();
}
