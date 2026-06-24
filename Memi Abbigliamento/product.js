/* ============================================================
   PRODUCT.JS — Memi Abbigliamento
   Shared PDP interactivity for every /products/<slug>/index.html
   page: gallery thumbnail swap, size selection, add-to-cart morph
   (hooks into the global cart/wishlist functions app.js exposes),
   and the description/shipping accordions.
   ============================================================ */
(function () {
  'use strict';

  function selectThumb(btn) {
    document.querySelectorAll('.thumb').forEach(function (t) { t.classList.remove('active'); });
    btn.classList.add('active');
    var cls = btn.dataset.imgClass;
    var main = document.getElementById('mainImg');
    if (main) main.className = 'ph-fig ' + cls;
  }
  window.selectThumb = selectThumb;

  var selectedSize = null;
  function selectSize(btn) {
    document.querySelectorAll('.size-btn').forEach(function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
    selectedSize = btn.textContent.trim();
    var label = document.getElementById('sizeLabel');
    if (label) label.textContent = '— ' + selectedSize;
    var atc = document.getElementById('atcBtn');
    if (atc) { atc.disabled = false; atc.style.opacity = '1'; atc.style.cursor = 'pointer'; }
  }
  window.selectSize = selectSize;

  function toggleAccordion(btn) {
    btn.parentElement.classList.toggle('open');
  }
  window.toggleAccordion = toggleAccordion;

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.getElementById('pdpRoot');
    if (!root) return;
    var productId    = root.dataset.id;
    var productName  = root.dataset.name;
    var productPrice = parseFloat(root.dataset.price);
    var colorKey     = root.dataset.colorKey;
    var colorLabel   = root.dataset.colorLabel;
    var hasSizes     = root.dataset.hasSizes === '1';

    var atcBtn = document.getElementById('atcBtn');
    if (atcBtn) {
      if (!hasSizes) { atcBtn.disabled = false; atcBtn.style.opacity = '1'; }
      else { atcBtn.style.opacity = '.5'; atcBtn.style.cursor = 'not-allowed'; }

      atcBtn.addEventListener('click', function () {
        if (hasSizes && !selectedSize) return;
        if (this.classList.contains('is-loading') || this.classList.contains('is-done')) return;
        this.classList.add('is-loading');
        var self = this;
        setTimeout(function () {
          self.classList.remove('is-loading');
          self.classList.add('is-done');
          if (typeof window.addToCart === 'function') {
            var variantBits = [colorLabel];
            if (hasSizes && selectedSize) variantBits.push(selectedSize);
            window.addToCart({
              id: productId + (selectedSize ? '-' + selectedSize.toLowerCase() : ''),
              name: productName,
              variant: variantBits.join(' · '),
              price: productPrice,
              color: colorKey
            });
          }
          var galleryEl = document.getElementById('mainImg');
          if (galleryEl && typeof window.flyToCart === 'function') window.flyToCart(galleryEl);
          setTimeout(function () { window.openCart && window.openCart(); }, 450);
          setTimeout(function () { self.classList.remove('is-done'); }, 1800);
        }, 320);
      });
    }

    var wishlistBtn = document.getElementById('wishlistBtn');
    if (wishlistBtn) {
      function syncWishBtn() {
        try {
          var wl  = JSON.parse(localStorage.getItem('memi_wishlist')) || [];
          // Match on base productId OR productId+size variant
          var on  = wl.some(function (i) {
            return i.productId === productId || i.id === productId ||
                   (selectedSize && i.id === productId + '-sz-' + selectedSize);
          });
          var heart = document.getElementById('wishlistHeart');
          var label = document.getElementById('wishlistBtnLabel');
          wishlistBtn.classList.toggle('active', on);
          wishlistBtn.classList.toggle('is-wishlisted', on);
          if (heart) heart.style.fill = on ? 'var(--blush-dark)' : 'none';
          if (label) label.textContent = on ? 'Nella wishlist ✓' : 'Salva nella wishlist';
        } catch (_) {}
      }
      syncWishBtn();
      wishlistBtn.addEventListener('click', function () {
        if (typeof window.toggleWishlist === 'function') {
          window.toggleWishlist(productId, productName, colorLabel, colorKey, selectedSize);
        }
        syncWishBtn();
      });
    }
  });
})();
