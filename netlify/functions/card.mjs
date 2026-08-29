/* Generates the social-preview card for one word, on demand.
   The creature is drawn by the very same engine the browser uses: the <script id="engine">
   block is lifted straight out of index.html and evaluated here, so a shared preview can
   never drift from what the visitor actually sees on the page. */
import { createCanvas, GlobalFonts, Path2D as NapiPath2D } from '@napi-rs/canvas';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const root = (...p) => join(HERE, '..', '..', ...p);

GlobalFonts.registerFromPath(root('fonts', 'fraunces-wonk.woff2'), 'Fraunces');
GlobalFonts.registerFromPath(root('fonts', 'newsreader-400.woff2'), 'Newsreader');
GlobalFonts.registerFromPath(root('fonts', 'newsreader-400-italic.woff2'), 'NewsreaderItalic');

// lift the shared engine out of the page and run it here
let SLITHY;
function engine() {
  if (SLITHY) return SLITHY;
  const html = readFileSync(root('index.html'), 'utf8');
  const m = html.match(/<script id="engine">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('engine block not found in index.html');
  const sandbox = { Path2D: NapiPath2D, Math, console };
  new Function('root', 'Path2D', m[1].replace(/\}\)\(typeof globalThis[^;]*;\s*$/, '})(root);'))(sandbox, NapiPath2D);
  SLITHY = sandbox.SLITHY;
  return SLITHY;
}

const PALETTE = { paper:'#e3e2d2', plate:'#edece1', ink:'#211d2c', ink2:'#5d5768',
                  rule:'#b5b3a0', accent:'#2e5c4e', brass:'#93712f', madder:'#95352a' };
const W = 1200, H = 630;

function wrap(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export default async (req) => {
  const url = new URL(req.url);
  const raw = (url.searchParams.get('w') || '').toLowerCase().replace(/[^a-z-]/g, '').slice(0, 20);
  const word = raw.length >= 2 ? raw : 'flusterbeak';

  const S = engine();
  const spec = S.describe(word);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = PALETTE.paper; ctx.fillRect(0, 0, W, H);

  // the creature, drawn by the shared engine
  const artW = 470, artH = 500, artX = 64, artY = (H - artH) / 2;
  ctx.save(); ctx.translate(artX, artY);
  const beast = S.buildBeast(word, artW, artH);
  S.paintAll(ctx, beast, { ink: PALETTE.ink, paper: PALETTE.plate, accent: PALETTE.accent });
  ctx.restore();

  const x = artX + artW + 52, maxW = W - x - 64;
  let y = 176;

  ctx.fillStyle = PALETTE.ink; ctx.font = '38px Fraunces';
  ctx.fillText('Slithy', x, y);
  const bw = ctx.measureText('Slithy').width;
  ctx.fillStyle = PALETTE.madder; ctx.fillText('.', x + bw, y);

  y += 26;
  ctx.fillStyle = PALETTE.brass; ctx.fillRect(x, y, 74, 2);

  // the word, shrunk until it fits on one line
  y += 78;
  let size = 76;
  ctx.font = `${size}px Fraunces`;
  while (size > 30 && ctx.measureText(word).width > maxW) { size -= 2; ctx.font = `${size}px Fraunces`; }
  ctx.fillStyle = PALETTE.ink; ctx.fillText(word, x, y);

  y += 44;
  // the IPA stress mark is absent from the packaged font subsets, so the card
  // uses an apostrophe; the page itself keeps the proper mark via browser fallback
  const pron = spec.pron.replace(/\u02c8/g, "'");
  ctx.font = '21px Newsreader'; ctx.fillStyle = PALETTE.ink2;
  ctx.fillText(pron, x, y);
  let px = x + ctx.measureText(pron).width;
  ctx.fillText(' · ', px, y);
  px += ctx.measureText(' · ').width;
  ctx.font = '21px NewsreaderItalic'; ctx.fillStyle = PALETTE.accent;
  ctx.fillText(spec.pos, px, y);

  y += 44;
  ctx.font = '25px Newsreader'; ctx.fillStyle = PALETTE.ink;
  for (const line of wrap(ctx, spec.def, maxW).slice(0, 4)) { ctx.fillText(line, x, y); y += 36; }

  y += 16;
  ctx.font = '19px NewsreaderItalic'; ctx.fillStyle = PALETTE.ink2;
  ctx.fillText('Coin a word. Meet its beast.', x, y);

  return new Response(canvas.toBuffer('image/png'), {
    headers: {
      'content-type': 'image/png',
      // scrapers refetch often; let the CDN keep each word's card
      'cache-control': 'public, max-age=31536000, immutable',
      'netlify-cdn-cache-control': 'public, durable, max-age=31536000',
    },
  });
};

export const config = { path: '/card.png' };
