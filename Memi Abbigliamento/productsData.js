/* ============================================================
   PRODUCTS DATA — Memi Abbigliamento
   Single, centralized source of truth for every product in the
   catalog. Each product can belong to MULTIPLE collections (tags),
   e.g. a linen dress can appear on /collections/shop-all,
   /collections/vestiti, /collections/novita AND
   /collections/estate-2025 at the same time.

   Used by:
   - scripts/generate-collections.js (build time) to bake the
     static /collections/<slug>/index.html pages.
   - Available to any future client-side script via window.PRODUCTS.

   To add a product: add an object below, list every collection
   slug it should appear under in `collections`, then re-run
   `node scripts/generate-collections.js` to rebuild the pages.
   ============================================================ */
(function (root) {
  'use strict';

  var PRODUCTS = [
    { id: 'vestito-lino-cannes',   name: 'Vestito Lino Cannes',   categoria: 'vestiti',   taglie: ['xs','s','m'],            colore: 'blush',    colorLabel: 'Rosa cipria',        price: 89,  isNew: true,  icon: 'dress', altColor: 'ph-sage',     popularity: 1,  collections: ['shop-all','vestiti','novita','estate-2025'] },
    { id: 'blazer-sartoriale-mia', name: 'Blazer Sartoriale Mia', categoria: 'blazer',    taglie: ['s','m','l'],             colore: 'salvia',   colorLabel: 'Verde salvia',       price: 105, originalPrice: 150, discountPct: 30, icon: 'dress', altColor: 'ph-blush', popularity: 7,  collections: ['shop-all','blazer','saldi'] },
    { id: 'top-seta-lucida-aria',  name: 'Top Seta Lucida Aria',  categoria: 'top',       taglie: ['xs','s'],                colore: 'lavanda',  colorLabel: 'Lavanda',            price: 65,  isNew: true,  icon: 'dress', altColor: 'ph-cream',    popularity: 3,  collections: ['shop-all','top','novita'] },
    { id: 'gonna-plisse-nuvola',   name: 'Gonna Plissé Nuvola',   categoria: 'gonne',     taglie: ['xs','s','m','l','xl'],   colore: 'avorio',   colorLabel: 'Avorio naturale',    price: 79,  icon: 'dress', altColor: 'ph-blush',    popularity: 16, collections: ['shop-all','gonne','estate-2025'] },
    { id: 'camicia-cotone-brisa',  name: 'Camicia Cotone Brisa',  categoria: 'top',       taglie: ['s','m','l'],             colore: 'blush',    colorLabel: 'Corallo pastello',   price: 55,  isNew: true,  icon: 'dress', altColor: 'ph-sage',     popularity: 5,  collections: ['shop-all','top','novita','estate-2025'] },
    { id: 'giacca-kimono-fresca',  name: 'Giacca Kimono Fresca',  categoria: 'blazer',    taglie: ['s','m','l','xl'],        colore: 'menta',    colorLabel: 'Verde menta',        price: 72,  originalPrice: 90,  discountPct: 20, icon: 'dress', altColor: 'ph-cream', popularity: 11, collections: ['shop-all','blazer','saldi'] },
    { id: 'set-coordinato-viola',  name: 'Set Coordinato Viola',  categoria: 'set',       taglie: ['xs','s','m'],            colore: 'lavanda',  colorLabel: 'Lilla morbido',      price: 130, icon: 'dress', altColor: 'ph-blush',    popularity: 13, collections: ['shop-all','set'] },
    { id: 'pantalone-culotte-zen', name: 'Pantalone Culotte Zen', categoria: 'pantaloni', taglie: ['s','m','l'],             colore: 'salvia',   colorLabel: 'Verde muschio',      price: 88,  icon: 'dress', altColor: 'ph-cream',    popularity: 17, collections: ['shop-all','pantaloni'] },
    { id: 'vestito-midi-fiori',    name: 'Vestito Midi Fiori',    categoria: 'vestiti',   taglie: ['xs','s','m','l'],        colore: 'antico',   colorLabel: 'Rosa antico',        price: 115, isNew: true,  icon: 'dress', altColor: 'ph-lavender', popularity: 9,  collections: ['shop-all','vestiti','novita'] },
    { id: 'gonna-wrap-salvia',     name: 'Gonna Wrap Salvia',     categoria: 'gonne',     taglie: ['s','m','l','xl'],        colore: 'salvia',   colorLabel: 'Verde salvia',       price: 70,  icon: 'dress', altColor: 'ph-peach',    popularity: 10, collections: ['shop-all','gonne','estate-2025'] },
    { id: 'maxi-cardigan-nuvola',  name: 'Maxi Cardigan Nuvola',  categoria: 'blazer',    taglie: ['xs','s'],                colore: 'lavanda',  colorLabel: 'Grigio cipria',      price: 85,  originalPrice: 100, discountPct: 15, icon: 'dress', altColor: 'ph-blush', popularity: 19, collections: ['shop-all','blazer','saldi'] },
    { id: 'top-bustier-perla',     name: 'Top Bustier Perla',     categoria: 'top',       taglie: ['xs','s','m','l'],        colore: 'avorio',   colorLabel: 'Avorio madreperla',  price: 48,  isNew: true,  icon: 'dress', altColor: 'ph-mint',     popularity: 12, collections: ['shop-all','top','novita'] },

    { id: 'borsa-tote-lino',        name: 'Borsa Tote Lino',        categoria: 'borse',    taglie: ['unica'], colore: 'espresso', colorLabel: 'Espresso',          price: 145, isNew: true, icon: 'bag',  altColor: 'ph-cream',  popularity: 4,  collections: ['shop-all','borse','accessori','novita','estate-2025'] },
    { id: 'borsa-tracolla-luna',    name: 'Borsa a Tracolla Luna',  categoria: 'borse',    taglie: ['unica'], colore: 'salvia',   colorLabel: 'Verde salvia',      price: 120, icon: 'bag',  altColor: 'ph-sage',   popularity: 14, collections: ['shop-all','borse','accessori'] },
    { id: 'borsa-bucket-sabbia',    name: 'Borsa Bucket Sabbia',    categoria: 'borse',    taglie: ['unica'], colore: 'avorio',   colorLabel: 'Avorio naturale',   price: 165, originalPrice: 205, discountPct: 20, icon: 'bag', altColor: 'ph-blush', popularity: 22, collections: ['shop-all','borse','accessori','saldi'] },

    { id: 'collana-perla-aurora',  name: 'Collana Perla Aurora',   categoria: 'gioielli', taglie: ['unica'], colore: 'avorio',   colorLabel: 'Avorio madreperla', price: 42, isNew: true, icon: 'ring', altColor: 'ph-cream',  popularity: 8,  collections: ['shop-all','gioielli','accessori','novita','estate-2025'] },
    { id: 'anello-filo-dorato',     name: 'Anello Filo Dorato',     categoria: 'gioielli', taglie: ['unica'], colore: 'espresso', colorLabel: 'Espresso',         price: 35, icon: 'ring', altColor: 'ph-lavender', popularity: 18, collections: ['shop-all','gioielli','accessori'] },
    { id: 'orecchini-goccia-rosa', name: 'Orecchini Goccia Rosa',  categoria: 'gioielli', taglie: ['unica'], colore: 'blush',    colorLabel: 'Rosa cipria',      price: 38, icon: 'ring', altColor: 'ph-sage',    popularity: 20, collections: ['shop-all','gioielli','accessori'] },

    { id: 'sandalo-listino-estate', name: 'Sandalo Listino Estate', categoria: 'scarpe',  taglie: ['38','39','40','41'],      colore: 'avorio',   colorLabel: 'Avorio naturale', price: 98,  isNew: true, icon: 'shoe', altColor: 'ph-blush', popularity: 6,  collections: ['shop-all','scarpe','accessori','novita','estate-2025'] },
    { id: 'mocassino-pelle-soft',   name: 'Mocassino Pelle Soft',   categoria: 'scarpe',  taglie: ['37','38','39','40'],      colore: 'espresso', colorLabel: 'Espresso',        price: 135, icon: 'shoe', altColor: 'ph-cream', popularity: 15, collections: ['shop-all','scarpe','accessori'] },
    { id: 'sneaker-tela-salvia',    name: 'Sneaker Tela Salvia',    categoria: 'scarpe',  taglie: ['38','39','40','41','42'], colore: 'salvia',   colorLabel: 'Verde salvia',    price: 89,  originalPrice: 105, discountPct: 15, icon: 'shoe', altColor: 'ph-sage', popularity: 2, collections: ['shop-all','scarpe','accessori','saldi'] },

    { id: 'cintura-pelle-sottile',  name: 'Cintura Pelle Sottile',  categoria: 'cinture',  taglie: ['unica'], colore: 'espresso', colorLabel: 'Espresso',    price: 32, icon: 'belt', altColor: 'ph-cream', popularity: 21, collections: ['shop-all','cinture','accessori'] },
    { id: 'set-bijoux-estate',      name: 'Set Bijoux Estate',      categoria: 'cinture',  taglie: ['unica'], colore: 'blush',    colorLabel: 'Rosa cipria', price: 28, isNew: true, icon: 'belt', altColor: 'ph-blush', popularity: 23, collections: ['shop-all','cinture','accessori','novita','estate-2025'] }
  ];

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PRODUCTS;
  } else {
    root.PRODUCTS = PRODUCTS;
  }
})(typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : this));
