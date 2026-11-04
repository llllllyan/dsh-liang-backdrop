import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url));

/** A dev checkout may keep the frames here; a published install does not. */
const BUNDLED_DIR = path.join(PLUGIN_DIR, 'assets', 'frames');
/** First-run download target, so each frame is fetched at most once. */
const CACHE_DIR = path.join(PLUGIN_DIR, '.frames-cache');

/**
 * The portraits are demo assets of Lichtspektrum/liang-intensity-calibrator and
 * are NOT covered by that project's MIT license, so this package never puts them
 * in its tarball: a published install downloads a frame once, then keeps it in
 * the local cache above. Point this at your own six square images with the same
 * file names if you want to opt out of the upstream host entirely.
 */
const FRAME_SOURCE = 'https://raw.githubusercontent.com/Lichtspektrum/liang-intensity-calibrator/main/public/frames';

export const FRAMES_ROUTE = '/plugins/liang-backdrop/frames';

/**
 * The six shipped stage keyframes: the first frame of each band in the source
 * scale (小难梁 / 牢梁 / 梁子 / 梁圣 / 梁神 / 梁祖 → 00, 06, 12, 18, 24, 30).
 * Anything else is unreachable, so there is no traversal or extra-file surface.
 */
export const FRAME_INDICES = new Set(['00', '06', '12', '18', '24', '30']);

const FRAME_FILE = /^frame-(0[0-9]|[12][0-9]|30)\.webp$/;

export const inject = ['webServer'];

function send(res, status, headers, body) {
  res.writeHead(status, {
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(body);
}

async function readIfPresent(directory, name) {
  try {
    return await readFile(path.join(directory, name));
  } catch {
    return null;
  }
}

async function loadFrame(ctx, name) {
  const bundled = await readIfPresent(BUNDLED_DIR, name);
  if (bundled) return bundled;

  const cached = await readIfPresent(CACHE_DIR, name);
  if (cached) return cached;

  const response = await fetch(`${FRAME_SOURCE}/${name}`);
  if (!response.ok) {
    throw new Error(`upstream responded ${response.status}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, name), bytes);
  } catch (error) {
    // A read-only install can still serve the bytes this once.
    ctx.logger?.warn?.(`liang-backdrop: cannot cache ${name}: ${String(error)}`);
  }
  return bytes;
}

/**
 * Serve the six portrait keyframes for the Client half, from the bundled copy,
 * the local cache, or the upstream source, in that order.
 */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: FRAMES_ROUTE,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        send(res, 405, { 'Content-Type': 'text/plain; charset=utf-8', Allow: 'GET, HEAD' }, 'GET required');
        return;
      }

      let pathname;
      try {
        pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
      } catch {
        send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, 'bad request');
        return;
      }

      const name = decodeURIComponent(pathname.slice(FRAMES_ROUTE.length)).replace(/^\//, '');
      const matched = FRAME_FILE.exec(name);
      if (!matched || !FRAME_INDICES.has(matched[1])) {
        send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, 'frame not found');
        return;
      }

      let bytes;
      try {
        bytes = await loadFrame(ctx, name);
      } catch (error) {
        ctx.logger?.warn?.(`liang-backdrop: cannot load ${name}: ${String(error)}`);
        send(res, 502, { 'Content-Type': 'text/plain; charset=utf-8' }, 'frame unavailable');
        return;
      }

      send(res, 200, {
        'Content-Type': 'image/webp',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'public, max-age=3600',
      }, req.method === 'HEAD' ? undefined : bytes);
    },
  }), 'liang-backdrop: frame route');
}
