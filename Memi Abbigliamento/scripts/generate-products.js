'use strict';
var fs = require('fs');
var path = require('path');

var PRODUCTS = require('../productsData.js');
var ROOT = path.join(__dirname, '..');

var CATEGORIA_LABEL = { vestiti: 'Vestiti', top: 'Top & Bluse', pantaloni: 'Pantaloni', gonne: 'Gonne', blazer: 'Blazer', set: 'Set Coordinati', borse: 'Borse', gioielli: 'Gioielli', scarpe: 'Scarpe', cinture: 'Cinture & Bijoux' };
var COLOR_HEX = { blush: '#F2C4BD', salvia: '#C4D4C0', lavanda: '#D6CEEA', avorio: '#E8DDD0', espresso: '#3B2B2B', menta: '#b5ceb5', antico: '#d4a5a0' };
var CATEGORIA_FLAVOR = {
  vestiti: 'pensato per chi ama la leggerezza e la femminilità di un capo versatile, perfetto dal giorno alla sera.',
  top: 'un capo essenziale da abbinare con disinvoltura a gonne, pantaloni o jeans per ogni occasione.',
  pantaloni: 'tagliato per un comfort senza compromessi, con una silhouette che valorizza ogni movimento.',
  gonne: 'un equilibrio di movimento e struttura, pensato per accompagnarti in ogni stagione.',
  blazer: 'la struttura sartoriale incontra una vestibilità rilassata, per un guardaroba sempre impeccabile.',
  set: 'un coordinato pensato per essere indossato insieme o separato, per due look in uno.',
  borse: 'un accessorio dal design pulito, pensato per l’uso quotidiano senza rinunciare allo stile.',
  gioielli: 'un dettaglio delicato che completa ogni look con un tocco di luce.',
  scarpe: 'comfort e stile si incontrano in un modello pensato per accompagnarti ogni giorno.',
  cinture: 'il dettaglio giusto per definire la silhouette e completare il look.'
};

var ICONS = {
  dress: '<ellipse cx="60" cy="40" rx="22" ry="24" fill="white" opacity=".45"/><path d="M18 220 C18 145 102 145 102 220" fill="white" opacity=".45"/><rect x="28" y="66" width="64" height="88" rx="10" fill="white" opacity=".45"/>',
  bag:   '<path d="M42 76 Q42 44 60 44 Q78 44 78 76" stroke="white" stroke-width="6" opacity=".45"/><rect x="26" y="76" width="68" height="86" rx="10" fill="white" opacity=".45"/>',
  ring:  '<circle cx="60" cy="125" r="34" stroke="white" stroke-width="7" opacity=".45"/><polygon points="60,72 74,96 46,96" fill="white" opacity=".45"/>',
  shoe:  '<path d="M18 156 Q18 122 50 116 L78 104 Q100 98 105 120 L105 156 Q105 167 95 167 L23 167 Q18 167 18 156 Z" fill="white" opacity=".45"/>',
  belt:  '<rect x="14" y="110" width="92" height="17" rx="4" fill="white" opacity=".45"/><rect x="47" y="96" width="26" height="44" rx="4" stroke="white" stroke-width="5" opacity=".45"/>'
};

var WISHLIST_SVG = '<svg viewBox="0 0 24 24"><path id="wishlistHeart" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>';

function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }

function renderRelatedCard(p) {
  var icon = ICONS[p.icon] || ICONS.dress;
  var pricing = '<span class="price-current">€' + p.price.toFixed(2).replace('.', ',') + '</span>';
  return '<a class="product-card-link" href="../../products/' + p.id + '/index.html"><article class="product-card">' +
    '<div class="product-img-wrap"><div class="product-img-main ph-fig ph-flat ph-shimmer"><svg viewBox="0 0 120 200" fill="none" class="fig-svg">' + icon + '</svg></div></div>' +
    '<div class="product-info"><p class="product-name">' + p.name + '</p><p class="product-color">' + p.colorLabel + '</p><div class="product-pricing">' + pricing + '</div></div>' +
  '</article></a>';
}

function renderProductPage(p) {
  var icon = ICONS[p.icon] || ICONS.dress;
  var catLabel = CATEGORIA_LABEL[p.categoria] || p.categoria;
  var hexMain = COLOR_HEX[p.colore] || '#E8DDD0';
  var hasSizes = !(p.taglie.length === 1 && p.taglie[0] === 'unica');

  var priceRow = '<span class="price-main">€' + p.price.toFixed(2).replace('.', ',') + '</span>';
  if (p.originalPrice) {
    priceRow += '<span class="price-old">€' + p.originalPrice.toFixed(2).replace('.', ',') + '</span><span class="price-tag">−' + p.discountPct + '%</span>';
  }

  var sizeSection = '';
  if (hasSizes) {
    var sizeBtns = p.taglie.map(function (t) {
      var label = t === 'unica' ? 'Unica' : t.toUpperCase();
      return '<button class="size-btn" onclick="selectSize(this)">' + label + '</button>';
    }).join('');
    sizeSection =
      '<div style="margin-bottom:var(--space-2);">' +
        '<p class="selector-label">Taglia <span id="sizeLabel">— Seleziona</span></p>' +
        '<div class="size-grid" role="group" aria-label="Seleziona taglia">' + sizeBtns + '</div>' +
      '</div>';
  }

  var related = PRODUCTS.filter(function (p2) { return p2.categoria === p.categoria && p2.id !== p.id; });
  if (related.length < 4) {
    PRODUCTS.forEach(function (p2) {
      if (related.length >= 4) return;
      if (p2.id === p.id) return;
      if (related.indexOf(p2) >= 0) return;
      related.push(p2);
    });
  }
  related = related.slice(0, 4);

  var description = p.name + ' in ' + p.colorLabel.toLowerCase() + ' — ' + (CATEGORIA_FLAVOR[p.categoria] || 'un capo Memi Abbigliamento pensato con cura, per uno stile pastello ed elegante.');

  return '<!DOCTYPE html>\n' +
'<html lang="it">\n' +
'<head>\n' +
'  <meta charset="UTF-8" />\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
'  <title>' + p.name + ' — Memi Abbigliamento</title>\n' +
'  <meta name="description" content="' + escapeAttr(description) + '" />\n' +
'  <link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />\n' +
'  <link rel="icon" href="data:,">\n' +
'  <link rel="stylesheet" href="../../tokens.css" />\n' +
'  <link rel="stylesheet" href="../../shop.css" />\n' +
'  <link rel="stylesheet" href="../../product.css" />\n' +
'  <link rel="stylesheet" href="../../app.css" />\n' +
'</head>\n' +
'<body>\n\n' +
'<div class="announcement-bar">✦ &nbsp;Spedizione gratuita su ordini superiori a €50 &nbsp;✦&nbsp; Reso gratuito entro 30 giorni &nbsp;✦</div>\n' +
'<div data-include="site-header"></div>\n\n' +
'<div class="breadcrumb">\n' +
'  <a href="../../index.html">Home</a>\n' +
'  <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>\n' +
'  <a href="../../collections/' + p.categoria + '/index.html">' + catLabel + '</a>\n' +
'  <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>\n' +
'  <span style="color:var(--espresso);">' + p.name + '</span>\n' +
'</div>\n\n' +
'<main class="pdp" id="pdpRoot" data-id="' + p.id + '" data-name="' + escapeAttr(p.name) + '" data-price="' + p.price + '" data-color-key="' + p.colore + '" data-color-label="' + escapeAttr(p.colorLabel) + '" data-has-sizes="' + (hasSizes ? '1' : '0') + '">\n' +
'  <div class="pdp-grid">\n' +
'    <div class="gallery">\n' +
'      <div class="gallery-main" id="galleryMain">\n' +
'        <div class="ph-fig ph-flat ph-shimmer" id="mainImg"><svg viewBox="0 0 120 220" fill="none">' + icon + '</svg></div>\n' +
'        <div class="gallery-zoom-hint"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>Zoom</div>\n' +
'      </div>\n' +
'      <div class="gallery-thumbs" role="list" aria-label="Viste prodotto">\n' +
'        <button class="thumb active" data-img-class="ph-flat ph-shimmer" onclick="selectThumb(this)" aria-label="Vista principale"><div class="ph-fig ph-flat ph-shimmer"><svg viewBox="0 0 120 220" fill="none">' + icon + '</svg></div></button>\n' +
'        <button class="thumb" data-img-class="' + p.altColor + '" onclick="selectThumb(this)" aria-label="Vista alternativa"><div class="ph-fig ' + p.altColor + '"><svg viewBox="0 0 120 220" fill="none">' + icon + '</svg></div></button>\n' +
'      </div>\n' +
'    </div>\n' +
'    <div class="pdp-info">\n' +
'      <p class="product-brand">Memi Abbigliamento</p>\n' +
'      <h1 class="product-title">' + p.name + '</h1>\n' +
'      <div class="product-price-row">' + priceRow + '</div>\n' +
'      <div class="color-display"><span class="color-dot" style="background:' + hexMain + ';"></span><span class="selector-label" style="margin:0;">Colore <span>— ' + p.colorLabel + '</span></span></div>\n' +
sizeSection +
'      <div class="cta-stack">\n' +
'        <button class="btn-atc atc-btn" id="atcBtn" disabled>\n' +
'          <span class="atc-label"><svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.6;vertical-align:middle;margin-right:6px;"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>Aggiungi al carrello</span>\n' +
'          <span class="atc-spinner"><svg class="atc-spinner-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9" stroke-opacity=".25"/><path d="M12 3a9 9 0 0 1 9 9" stroke-linecap="round"/></svg></span>\n' +
'          <span class="atc-check"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4"><polyline points="20 6 9 17 4 12"/></svg></span>\n' +
'        </button>\n' +
'        <button class="btn-wishlist" id="wishlistBtn">' + WISHLIST_SVG + '<span id="wishlistBtnLabel">Salva nella wishlist</span></button>\n' +
'      </div>\n' +
'      <div class="mini-perks">\n' +
'        <div class="mini-perk"><svg viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>Spedizione gratuita — consegna in 2–3 giorni lavorativi</div>\n' +
'        <div class="mini-perk"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Reso gratuito entro 30 giorni</div>\n' +
'        <div class="mini-perk"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Pagamento sicuro — SSL crittografato</div>\n' +
'      </div>\n' +
'      <div class="accordions">\n' +
'        <div class="accordion-item open"><button class="accordion-header" onclick="toggleAccordion(this)">Descrizione<svg class="accordion-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button><div class="accordion-body"><p>' + description + '</p></div></div>\n' +
'        <div class="accordion-item"><button class="accordion-header" onclick="toggleAccordion(this)">Spedizione &amp; Resi<svg class="accordion-chevron" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></button><div class="accordion-body"><ul><li>Spedizione standard gratuita su ordini ≥ €50 (2–3 giorni)</li><li>Spedizione express €8,90 (1 giorno lavorativo)</li><li>Reso gratuito entro 30 giorni dall’acquisto</li><li>Rimborso completo entro 5 giorni dalla ricezione del reso</li></ul></div></div>\n' +
'      </div>\n' +
'    </div>\n' +
'  </div>\n' +
'</main>\n\n' +
'<section class="related">\n' +
'  <h2 class="related-title">Ti potrebbe <em>piacere</em></h2>\n' +
'  <div class="product-grid">\n    ' + related.map(renderRelatedCard).join('\n    ') + '\n  </div>\n' +
'</section>\n\n' +
'<script src="../../productsData.js"></script>\n' +
'<script src="../../app.js"></script>\n' +
'<script src="../../product.js"></script>\n' +
'</body>\n' +
'</html>\n';
}

var outDir = path.join(ROOT, 'products');
PRODUCTS.forEach(function (p) {
  var html = renderProductPage(p);
  var dir = path.join(outDir, p.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
  console.log('Generated products/' + p.id + '/index.html');
});
