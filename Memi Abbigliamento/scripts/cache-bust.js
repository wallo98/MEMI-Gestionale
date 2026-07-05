#!/usr/bin/env node
'use strict';
/*
 * cache-bust.js — automatic, content-hash cache-busting for the static storefront.
 *
 * Scans every .html file, finds local <script src> / <link href> references to
 * .js/.css files (with or without an existing ?v=), and rewrites the version to
 * a short content hash of the referenced file. The hash only changes when the
 * file's bytes change, so you never bump `?v=N` by hand again — and returning
 * visitors always get fresh JS/CSS after a real change.
 *
 * Auto-discovers assets (root-level and relative refs like ../../app.js) — no
 * hardcoded asset list, so newly added CSS/JS files are covered automatically.
 *
 * Usage:  node scripts/cache-bust.js [rootDir]      (rootDir defaults to the storefront root)
 * Runs at build time in the Dockerfile (see the multi-stage build). Safe to run repeatedly;
 * it is deterministic and never throws (a failure logs a warning and leaves files untouched).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..'));

function sha(p) {
  try { return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 8); }
  catch (_) { return null; }
}

function walkHtml(dir, out) {
  out = out || [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git' || e.name === 'scripts') continue;
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) walkHtml(fp, out);
    else if (e.name.endsWith('.html')) out.push(fp);
  }
  return out;
}

try {
  // Matches src="..." or href="..." pointing at a .js/.css file, optional ?v=...
  const REF = /(src|href)=(["'])([^"':>]+\.(?:js|css))(\?v=[^"']*)?\2/g;
  let changed = 0;
  for (const file of walkHtml(ROOT)) {
    let html;
    try { html = fs.readFileSync(file, 'utf8'); } catch (_) { continue; }
    const before = html;
    html = html.replace(REF, (m, attr, q, ref, _v) => {
      if (/^(https?:)?\/\//.test(ref)) return m;            // external URL — skip
      const abs = ref.startsWith('/')
        ? path.join(ROOT, ref)                               // site-absolute
        : path.join(path.dirname(file), ref);                // relative to the HTML file
      const h = sha(abs);
      if (!h) return m;                                      // file not found — leave as-is
      return attr + '=' + q + ref + '?v=' + h + q;
    });
    if (html !== before) { try { fs.writeFileSync(file, html); changed++; } catch (_) {} }
  }
  console.log('cache-bust: ' + changed + ' HTML files updated under ' + ROOT);
} catch (err) {
  console.warn('cache-bust skipped: ' + (err && err.message));
}
