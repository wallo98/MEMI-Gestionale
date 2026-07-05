'use strict';

/**
 * /api/admin/products  — Bulk product import (admin only)
 *
 *  POST /api/admin/products/import           Import products from a CSV
 *       ?dryRun=1                            Validate + preview only, no writes
 *       body: multipart file "file"  OR  JSON { csv: "<text>" }
 *  GET  /api/admin/products/import/template  Download a ready-to-fill CSV template
 *
 * Design note: this is a *synchronous* importer with a dry-run preview — the
 * right fit for a boutique catalog (tens–hundreds of rows). No message queue /
 * background worker is needed at this scale; the request returns a full result
 * summary. Images are pulled from public URLs in the CSV and run through the
 * existing sharp → WebP pipeline (images.js), so they're served like any other
 * product photo.
 */

const router = require('express').Router();
const multer = require('multer');
const { pool } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { processAndStore } = require('../images');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const COLUMNS = ['id','name','categoria','colore','color_label','price','original_price',
  'discount_pct','is_new','popularity','collections','description','status','sizes','image_urls'];

/* ── tiny RFC-4180-ish CSV parser (quotes, commas, newlines inside quotes) ── */
function parseCSV(text) {
  text = String(text).replace(/^﻿/, '');            // strip BOM
  const rows = []; let row = [], field = '', i = 0, inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } inQ = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));   // drop blank lines
}
function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(r => {
    const o = {};
    headers.forEach((h, idx) => { o[h] = (r[idx] != null ? r[idx].trim() : ''); });
    return o;
  });
}

/* ── field coercion helpers ── */
function parseSizes(s) {                                   // "S:5|M:8|L:3"
  if (!s) return [];
  return s.split('|').map(p => {
    const [t, st] = p.split(':');
    if (!t || !t.trim()) return null;
    return { taglia: t.trim(), stock: parseInt(String(st || '0').trim(), 10) || 0 };
  }).filter(Boolean);
}
function parseList(s) { return s ? s.split('|').map(x => x.trim()).filter(Boolean) : []; }
function toBool(s) { return /^(1|true|si|s[iì]|yes|y)$/i.test(String(s || '').trim()); }
function toNum(s, def = 0) { const n = parseFloat(String(s == null ? '' : s).replace(',', '.')); return isNaN(n) ? def : n; }

function validateRow(o) {
  const e = [];
  if (!o.id) e.push('id mancante');
  if (!o.name) e.push('name mancante');
  if (!o.categoria) e.push('categoria mancante');
  if (o.price === '' || isNaN(toNum(o.price, NaN))) e.push('price non valido');
  if (o.status && !['attivo', 'bozza', 'esaurito', 'archiviato'].includes(o.status))
    e.push('status non valido');
  return e;
}

async function fetchImageBuffer(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error('URL non valido');
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) throw new Error('Immagine troppo grande');
  return buf;
}

/* map a CSV row → the products column set (keys are fixed, never user-controlled) */
function toFields(o) {
  return {
    name:         o.name,
    categoria:    o.categoria,
    colore:       o.colore || null,
    color_label:  o.color_label || null,
    price:        toNum(o.price),
    original_price: o.original_price ? toNum(o.original_price) : null,
    discount_pct: o.discount_pct ? Math.round(toNum(o.discount_pct)) : 0,
    is_new:       toBool(o.is_new) ? 1 : 0,
    popularity:   o.popularity ? Math.round(toNum(o.popularity)) : 0,
    collections:  JSON.stringify(parseList(o.collections)),
    description:  o.description || null,
    status:       o.status || 'attivo',
  };
}

/* ── POST /import ── */
router.post('/import', requireAdmin, upload.single('file'), async (req, res) => {
  const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true' || req.body.dryRun === '1' || req.body.dryRun === true;

  let text = '';
  if (req.file) text = req.file.buffer.toString('utf8');
  else if (typeof req.body.csv === 'string') text = req.body.csv;
  else return res.status(400).json({ error: 'Fornisci un file CSV ("file") o il campo "csv".' });

  let objects;
  try { objects = rowsToObjects(parseCSV(text)); }
  catch (e) { return res.status(400).json({ error: 'CSV non leggibile: ' + e.message }); }
  if (!objects.length) return res.status(400).json({ error: 'Il CSV non contiene righe dati.' });
  if (objects.length > 2000) return res.status(400).json({ error: 'Troppe righe (max 2000 per import).' });

  // Which ids already exist → create vs update
  const ids = objects.map(o => o.id).filter(Boolean);
  const existing = new Set();
  if (ids.length) {
    const [rows] = await pool.query('SELECT id FROM products WHERE id IN (?)', [ids]);
    rows.forEach(r => existing.add(r.id));
  }

  const preview = objects.map((o, idx) => {
    const errors = validateRow(o);
    return {
      row: idx + 2, id: o.id || '', name: o.name || '',
      action: errors.length ? 'error' : (existing.has(o.id) ? 'update' : 'create'),
      errors,
    };
  });

  if (dryRun) {
    return res.json({
      dryRun: true,
      total: objects.length,
      create: preview.filter(p => p.action === 'create').length,
      update: preview.filter(p => p.action === 'update').length,
      errors: preview.filter(p => p.action === 'error').length,
      preview,
    });
  }

  // ── real import ──
  let created = 0, updated = 0, imagesOk = 0, imagesFail = 0;
  const results = [];
  for (let idx = 0; idx < objects.length; idx++) {
    const o = objects[idx];
    const errs = validateRow(o);
    if (errs.length) { results.push({ row: idx + 2, id: o.id, status: 'error', errors: errs }); continue; }

    const isUpdate = existing.has(o.id);
    const f = toFields(o);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      if (isUpdate) {
        const keys = Object.keys(f);
        await conn.execute(
          `UPDATE products SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`,
          [...keys.map(k => f[k]), o.id]
        );
      } else {
        const cols = ['id', ...Object.keys(f), 'images'];
        const vals = [o.id, ...Object.keys(f).map(k => f[k]), JSON.stringify([])];
        await conn.execute(
          `INSERT INTO products (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
          vals
        );
      }
      // sizes: full replace for this product
      const sizes = parseSizes(o.sizes);
      if (sizes.length) {
        await conn.execute('DELETE FROM product_sizes WHERE product_id = ?', [o.id]);
        for (const s of sizes) {
          await conn.execute('INSERT INTO product_sizes (product_id, taglia, stock) VALUES (?, ?, ?)', [o.id, s.taglia, s.stock]);
        }
      }
      await conn.commit();
      isUpdate ? updated++ : created++;
    } catch (err) {
      await conn.rollback();
      results.push({ row: idx + 2, id: o.id, status: 'error', errors: [err.code === 'ER_DUP_ENTRY' ? 'ID duplicato' : err.message] });
      conn.release();
      continue;
    }
    conn.release();

    // images (best-effort, after the product is committed)
    const urls = parseList(o.image_urls);
    if (urls.length) {
      const imgs = [];
      for (const url of urls) {
        try { imgs.push(await processAndStore(await fetchImageBuffer(url))); imagesOk++; }
        catch (_) { imagesFail++; }
      }
      if (imgs.length) {
        try {
          const [[p]] = await pool.execute('SELECT images FROM products WHERE id = ?', [o.id]);
          let cur = []; try { cur = JSON.parse(p.images) || []; } catch (_) {}
          if (!Array.isArray(cur)) cur = [];
          await pool.execute('UPDATE products SET images = ? WHERE id = ?', [JSON.stringify(cur.concat(imgs)), o.id]);
        } catch (_) { /* non-fatal */ }
      }
    }
    results.push({ row: idx + 2, id: o.id, status: isUpdate ? 'updated' : 'created' });
  }

  return res.json({
    ok: true, created, updated,
    errors: results.filter(r => r.status === 'error').length,
    imagesOk, imagesFail, results,
  });
});

/* ── GET /import/template ── (public: it's just a blank sample, no data) ── */
router.get('/import/template', (req, res) => {
  const csv =
    COLUMNS.join(',') + '\n' +
    'vestito-lino-demo,Vestito in lino Demo,vestiti,blush,Rosa cipria,89.90,,0,1,10,shop-all|vestiti,' +
    'Vestito in lino leggero dal taglio morbido.,attivo,S:5|M:8|L:3,' +
    'https://esempio.it/vestito-fronte.jpg|https://esempio.it/vestito-retro.jpg' + '\n' +
    'blazer-sartoriale-demo,Blazer Sartoriale Demo,blazer,verde,Salvia,129.00,159.00,19,0,5,shop-all|blazer,' +
    'Blazer sartoriale foderato.,attivo,S:2|M:4|L:2,https://esempio.it/blazer.jpg' + '\n';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="memi-import-template.csv"');
  res.send(csv);
});

module.exports = router;
