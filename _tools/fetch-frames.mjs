// Download the six stage keyframes into assets/frames/.
// Source: https://github.com/Lichtspektrum/liang-intensity-calibrator (public/frames)
//
// The source scale has 31 frames from -15 to +15; the plugin ships only the first
// frame of each of the six named bands. To pull all 31 again, set ALL = true.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALL = false;
const STAGE_STARTS = [0, 6, 12, 18, 24, 30];
const INDICES = ALL ? Array.from({ length: 31 }, (_, i) => i) : STAGE_STARTS;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '..', 'assets', 'frames');
const BASE = 'https://raw.githubusercontent.com/Lichtspektrum/liang-intensity-calibrator/main/public/frames';

await mkdir(OUT, { recursive: true });

const results = [];
for (const index of INDICES) {
  const name = `frame-${String(index).padStart(2, '0')}.webp`;
  const res = await fetch(`${BASE}/${name}`);
  if (!res.ok) {
    results.push(`${name} -> HTTP ${res.status}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(OUT, name), buf);
  results.push(`${name} -> ${buf.length} bytes`);
}
console.log(results.join('\n'));
