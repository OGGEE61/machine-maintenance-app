// Rebuilds the machine catalogue from the product pages on gross-zerkleinerer.de.
// Usage: npm run sync:gross, then review the diff of src/data/gross-catalogue.ts and public/machines.
import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://gross-zerkleinerer.de/en';
const ROOT = path.join(import.meta.dirname, '..');
const OUTPUT = path.join(ROOT, 'src/data/gross-catalogue.ts');
const IMAGES = path.join(ROOT, 'public/machines');

// Our machine id (which orders and the database refer to) and where its page lives
const MACHINES = [
  ['genius-2-40', 'briquette-presses/genius-2-40'],
  ['genius-2-50', 'briquette-presses/genius-2-50'],
  ['genius-2-60', 'briquette-presses/genius-2-60'],
  ['genius-2-70', 'briquette-presses/genius-2-70'],
  ['gp-80', 'briquette-presses/gp-80'],
  ['gp-100', 'briquette-presses/gp-100'],
  ['gp-150', 'briquette-presses/gp-150'],
  ['gp-200', 'briquette-presses/gp-200'],
  ['gp-300-s', 'briquette-presses/gp-300-s'],
  ['gp-400-m', 'briquette-presses/gp-400-m'],
  ['gaz-600', 'shredders/gaz-600'],
  ['gaz-62', 'shredders/gaz-62'],
  ['gaz-82', 'shredders/gaz-82'],
  ['gaz-82-s', 'shredders/gaz-82-s'],
  ['gaz-102', 'shredders/gaz-102'],
  ['gaz-102-s', 'shredders/gaz-102-s'],
  ['gaz-152-s', 'shredders/gaz-152-s'],
  ['gazk-800', 'shredders/gazk-800'],
  ['gazk-1000', 'shredders/gazk-1000'],
  ['gazk-1500', 'shredders/gazk-1500'],
  ['gazk-2000', 'shredders/gazk-2000'],
  ['ghz-b4', 'shredders/ghz-b4'],
  ['ghz-3-6', 'shredders/ghz-3-6'],
  ['ghz-t-6-13', 'shredders/ghz-t'],
  ['gz-30', 'shredders/gz-30'],
  ['gz-40', 'shredders/gz-40'],
  ['gz-50', 'shredders/gz-50'],
];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…' };

function decode(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name] ?? match);
}

function text(html) {
  return decode((html ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// The inner HTML of the first element with this class
function inner(html, className, tag = '[a-z0-9]+') {
  return html.match(new RegExp(`<(${tag})[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`))?.[2] ?? '';
}

function largestImage(html, pattern) {
  const urls = [...html.matchAll(/https:\/\/gross-zerkleinerer\.de\/wp-content\/uploads\/[^"' ,)]+?\.webp/g)]
    .map((match) => match[0])
    .filter((url) => pattern.test(url.split('/').pop()));
  const width = (url) => Number(url.match(/-(\d+)x\d+-c-default/)?.[1] ?? 0);
  return urls.sort((a, b) => width(b) - width(a))[0] ?? null;
}

function parseModules(html) {
  return [...html.matchAll(/<div class="infoBox" data-index="\d+" style="left:([\d.]+)%; ?top:([\d.]+)%"/g)].map((match) => {
    const box = html.slice(match.index, match.index + 2500);
    return {
      name: text(inner(box, 'infoBox__title', 'h3')),
      description: text(inner(box, 'infoBox__description', 'p')),
      x: Number(match[1]),
      y: Number(match[2]),
    };
  });
}

function parsePage(html) {
  const body = html.replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/gi, ' ');
  const specs = body.slice(body.indexOf('productSpecs__specsList'));
  const seeThrough = largestImage(html, /see_through/);
  const family = seeThrough?.split('/').pop().split('_see_through')[0];

  return {
    name: text(inner(body, 'headerProductDetail__title', '(?:h1|div|p)')),
    category: text(inner(body, 'headerProductDetail__description', '(?:p|div)')),
    label: text(inner(body, 'headerProductDetail__label', 'p')).replace(/^\(\s*|\s*\)$/g, ''),
    summary: decode(html.match(/og:description" content="([^"]*)"/)?.[1] ?? ''),
    audience: text(inner(inner(body, 'textIntroduction__taglineContainer', 'div') + '</div>', 'font-XS', 'span')),
    // A few pages put the introduction in a different section, but it always opens the same way
    intro: text(inner(body, 'textIntroduction__mainText', 'p') || body.match(/<p[^>]*>\s*The GROSS [\s\S]*?<\/p>/)?.[0]),
    howItWorks: text(inner(body, 'productSpecs__intro', 'div')),
    specs: [...specs.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)].map((m) => ({ label: text(m[1]), value: text(m[2]) })),
    specsNote: text(inner(body, 'productSpecs__specsDisclaimer', '(?:p|div)')),
    brochureUrl: html.match(/https:\/\/[^"' ]+\.pdf/)?.[0] ?? null,
    photoUrl: family ? largestImage(html, new RegExp(`^${family.replace(/[-_]/g, '[-_]')}_web-\\d`)) : null,
    seeThroughUrl: seeThrough,
    modules: parseModules(body),
  };
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (GROSS service app catalogue sync)' } });
  if (!res.ok) throw new Error(`${url} responded with ${res.status}`);
  return res.text();
}

async function main() {
  const catalogue = [];
  const issues = [];

  for (const [id, page] of MACHINES) {
    const sourceUrl = `${SITE}/${page}/`;
    const parsed = parsePage(await fetchText(sourceUrl));
    if (!parsed.modules.length) issues.push(`${id}: no hotspots found`);
    if (!parsed.specs.length) issues.push(`${id}: no specifications found`);
    if (!parsed.photoUrl || !parsed.seeThroughUrl) issues.push(`${id}: images not found`);
    catalogue.push({ id, type: page.startsWith('shredders') ? 'shredder' : 'briquetting', sourceUrl, ...parsed });
    console.log(`  ✓ ${id}: ${parsed.modules.length} hotspots, ${parsed.specs.length} specs`);
  }

  if (issues.length) {
    throw new Error(`Nothing was written, because the site's pages may have changed:\n${issues.join('\n')}`);
  }

  // GROSS shares images between similar models: keep one local copy of each
  const localFiles = new Map();
  const download = async (url, name) => {
    if (!localFiles.has(url)) {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (GROSS service app catalogue sync)' } });
      if (!res.ok) throw new Error(`${url} responded with ${res.status}`);
      fs.writeFileSync(path.join(IMAGES, `${name}.webp`), Buffer.from(await res.arrayBuffer()));
      localFiles.set(url, `/machines/${name}.webp`);
    }
    return localFiles.get(url);
  };
  for (const machine of catalogue) {
    machine.image = await download(machine.photoUrl, machine.id);
    machine.xrayImage = await download(machine.seeThroughUrl, `${machine.id}-xray`);
    delete machine.photoUrl;
    delete machine.seeThroughUrl;
  }

  fs.writeFileSync(OUTPUT, `// Generated by scripts/sync-gross-site.mjs from gross-zerkleinerer.de. Do not edit by hand;
// corrections to what the site publishes belong in machines.ts.
import type { GrossMachine } from '@/types';

export const grossCatalogue: GrossMachine[] = ${JSON.stringify(catalogue, null, 2)};
`);
  console.log(`Wrote ${catalogue.length} machines and ${localFiles.size} images.`);
}

await main();
