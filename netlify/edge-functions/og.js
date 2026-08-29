/* Scrapers don't run JavaScript, so the page they fetch has to already name the
   right card. This rewrites the social meta tags from ?w= before the HTML is sent.
   Visitors get the identical page — only the tags in <head> differ. */
const clean = (s) => (s || '').toLowerCase().replace(/[^a-z-]/g, '').slice(0, 20);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export default async (request, context) => {
  const url = new URL(request.url);
  const word = clean(url.searchParams.get('w'));
  if (word.length < 2) return; // no word: serve the page untouched, with its default card

  const res = await context.next();
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return res;

  const origin = url.origin;
  const card = `${origin}/card.png?w=${encodeURIComponent(word)}`;
  const pageUrl = `${origin}/?w=${encodeURIComponent(word)}`;
  const title = esc(word);
  const desc = esc(`${word} — an invented word, and the beast it draws.`);

  let html = await res.text();
  const set = (attr, key, value) => {
    const re = new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
    if (re.test(html)) html = html.replace(re, `$1${value}$2`);
    else html = html.replace('</head>', `<meta ${attr}="${key}" content="${value}">\n</head>`);
  };
  set('property', 'og:image', card);
  set('property', 'og:url', pageUrl);
  set('property', 'og:title', title);
  set('property', 'og:description', desc);
  set('property', 'og:image:alt', esc(`An engraved creature for the invented word ${word}.`));
  set('name', 'twitter:image', card);
  set('name', 'twitter:title', title);
  set('name', 'twitter:description', desc);
  set('name', 'twitter:image:alt', esc(`An engraved creature for the invented word ${word}.`));

  return new Response(html, {
    status: res.status,
    headers: { ...Object.fromEntries(res.headers), 'content-type': 'text/html; charset=utf-8' },
  });
};

export const config = { path: '/*', excludedPath: ['/card.png', '/*.png', '/*.css', '/*.js'] };
