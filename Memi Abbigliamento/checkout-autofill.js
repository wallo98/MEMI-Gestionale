/* ============================================================
   checkout-autofill.js — Memi Abbigliamento
   Pre-fills the checkout form from the logged-in customer's
   profile (dati personali) + their default saved address
   (indirizzi). Guests are unaffected. Only fills EMPTY fields,
   so a restored draft or anything the user typed is never
   overwritten. Requires api-client.js loaded first.
   ============================================================ */
(function () {
  'use strict';

  var A = window.MemiAPI && window.MemiAPI.auth;
  if (!A || !A.isLoggedIn()) return;   // guest checkout → nothing to do

  function el(id){ return document.getElementById(id); }
  function fill(id, val){
    var e = el(id);
    if (e && val != null && String(val).trim() !== '' && !String(e.value || '').trim()) e.value = val;
  }

  // Storefront paese label → the checkout <select id="country"> option values.
  var COUNTRY = { 'Italia':'IT', 'Italy':'IT', 'Germania':'DE', 'Francia':'FR', 'Spagna':'ES', 'Paesi Bassi':'NL' };

  Promise.all([
    A.me(),
    (A.addresses && A.addresses.list) ? A.addresses.list().catch(function(){ return { addresses: [] }; })
                                      : Promise.resolve({ addresses: [] })
  ]).then(function (r) {
    var u    = (r[0] && (r[0].user || r[0])) || {};
    var list = (r[1] && r[1].addresses) || [];

    // Prefer the default address; fall back to the first saved one, then the profile.
    var def = null;
    for (var i = 0; i < list.length; i++){ if (list[i].is_default){ def = list[i]; break; } }
    if (!def && list.length) def = list[0];

    // ── Personal info ──
    fill('firstName', u.nome);
    fill('lastName',  u.cognome);
    fill('email',     u.email);
    fill('phone',     (def && def.telefono) || u.telefono);

    // ── Shipping address (default address wins, else the profile's single line) ──
    var street = def ? [def.indirizzo, def.numero_civico].filter(Boolean).join(', ') : u.indirizzo;
    fill('address', street);
    fill('city', (def && def.citta) || u.citta);
    fill('cap',  (def && def.cap)  || u.cap);

    // Country is a <select>; map the saved paese to its option value.
    var paese = (def && def.paese) || u.paese || 'Italia';
    var cc = COUNTRY[paese] || (String(paese).length === 2 ? String(paese).toUpperCase() : 'IT');
    var sel = el('country');
    if (sel && (!sel.value || sel.value === 'IT')) sel.value = cc;

    // Nudge the checkout's own validation / draft-persistence to notice the values.
    ['firstName','lastName','email','phone','address','city','cap'].forEach(function (id) {
      var e = el(id);
      if (e && e.value) {
        e.dispatchEvent(new Event('input',  { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }).catch(function () { /* token expired / offline → leave as guest checkout */ });
})();
