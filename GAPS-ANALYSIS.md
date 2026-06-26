# MEMI — Gap Analysis Completo
*Aggiornato: Giugno 2026 (post sprint 2 — email, catalogo dinamico, account tracking, newsletter, SEO, admin mobile)*

---

## Riepilogo esecutivo

Il progetto MEMI Abbigliamento è composto da tre layer distinti: il **frontend e-commerce** (`Memi Abbigliamento/`), il **pannello admin** (`MEMI/`), e il **backend Node.js** (`MEMI-Backend/`). Dopo il sprint completo di Giugno 2026: il frontend ha pagamenti Stripe reali, filtri multi-selezione, mega-menu Editoriali, e view-toggle; il backend ha tutti i route implementati inclusi pagamenti ed email; il pannello admin carica dati reali dal backend tramite il pattern `_origRenderView` override.

---

## 1. Pagamenti — ✅ Implementato con Stripe

**Stato:** ✅ Risolto (Giugno 2026)

Il checkout usa **Stripe Elements** con il flusso PaymentIntent:
- `checkout.html` monta un `CardElement` Stripe; al submit chiama `POST /api/payments/create-intent`
- Ottiene `client_secret`, poi `stripe.confirmCardPayment()` — carta addebitata lato Stripe
- Solo dopo successo Stripe chiama `MemiAPI.orders.place()` con `payment_intent_id`
- `orders.js` verifica il PaymentIntent tramite Stripe SDK prima di salvare l'ordine nel DB
- Errori Stripe (carta rifiutata, fondi insufficienti) mostrati all'utente in italiano
- Backend risponde 503 se `STRIPE_SECRET_KEY` non è impostata (nessun crash)

**Env vars richiesti:** `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`

---

## 2. Pannello Admin — ✅ Dati reali integrati

**Stato:** ✅ Risolto (Giugno 2026)

Il file `MEMI/js/app.js` usa il pattern `_origRenderView` override: intercetta ogni `renderView(name)` e carica prima i dati reali dal backend, poi popola il `DATA` object e chiama il render originale. Su errore API, cade sul render con mock data come fallback.

### 2.1 Sezioni del pannello e loro stato

| Sezione sidebar | Stato attuale |
|---|---|
| Dashboard (KPI, grafico vendite) | ✅ Reale — `AdminAPI.dashboard.kpis()` + `recentOrders()` |
| Ordini | ✅ Reale — `AdminAPI.orders.list()` con trasformazione campi DB |
| Ordini bozze / abbandonati | ✅ Reale — filtro per `order_status` |
| Prodotti | ✅ Reale — `AdminAPI.products.listAll()` (status=all) |
| Inventario | ✅ Reale — stessa API, vista filtrata |
| Clienti | ✅ Reale — `AdminAPI.customers.list()`, VIP calcolato (spent > 300) |
| Sconti & Coupon | ✅ Reale — `AdminAPI.discounts.list()` |
| Spedizioni / Zone / Corrieri | ✅ Reale — `AdminAPI.shipping.zones()` + `.couriers()` + `.shipments()` |
| Marketing/Newsletter | ⚠️ Mock (non prioritario) |
| Chat / Messaggi | ⚠️ Mock (non implementato) |
| Analytics | ⚠️ Grafici SVG statici |
| Finanza, CMS, Canali | ⚠️ Non implementati |

### 2.2 Pattern implementato

`_origRenderView = renderView` salva il renderer originale. L'override intercetta ogni chiamata a `renderView(name)`, chiama l'API appropriata, aggiorna `DATA`, poi chiama `_origRenderView(name)`. Su `.fail()` cade sul render con mock data come fallback sicuro.

---

## 3. Backend — ✅ Tutti i route implementati

**Stato:** ✅ Completo (Giugno 2026)

Tutti i route che il frontend richiede sono implementati:

| Route | File | Stato |
|---|---|---|
| `POST /api/auth/register` | `auth.js` | ✅ |
| `POST /api/auth/login` | `auth.js` | ✅ |
| `GET /api/auth/me` | `auth.js` | ✅ |
| `GET /api/products` | `products.js` | ✅ |
| `POST /api/orders` | `orders.js` | ✅ + Stripe verify + inventory deduct + email |
| `GET /api/orders/my` | `orders.js` | ✅ |
| `GET /api/admin/customers` | `customers.js` | ✅ |
| `GET /api/shipping/zones` | `shipping.js` | ✅ |
| `POST /api/payments/create-intent` | `payments.js` | ✅ (nuovo) |
| `GET /api/admin/dashboard/kpis` | `dashboard.js` | ✅ |
| `GET /api/admin/dashboard/recent-orders` | `dashboard.js` | ✅ |

---

## 4. Catalogo prodotti — ✅ Completamente dinamico (Giugno 2026)

**Stato:** ✅ **Ogni superficie del catalogo legge live dal database via API. Niente è più hardcoded.**

`shop.html` carica i prodotti via `GET /api/products` (`initShopCatalog()`). `index.html` ("Nuovi Arrivi") via `?novita=1`. `search.html` via `MemiAPI.products.list()`. `product.html` via `GET /api/products/:id`.

**Risolto il gap delle pagine statiche** — introdotto `catalog-loader.js`, un loader condiviso (strategia 2 sotto) usato da:

| Pagina | Prima | Ora |
|---|---|---|
| `collections/{slug}/index.html` (15) | card + `resultCount` hardcoded | `GET /api/products?collection={slug}`, card + conteggi reali |
| `estate-2025.html` | 12 card statiche | `?collection=estate-2025`, filtro per categoria live |
| `best-seller.html` | 11 card statiche | `GET /api/products` ordinati per popolarità (top‑3 + resto) |
| `products/{slug}/index.html` (23) | dettaglio pre‑renderizzato da `productsData.js` | **redirect** a `/product?id={slug}` (URL invariato, `rel=canonical`, `noindex`) |

Per le pagine prodotto si è scelta la **strategia 1 (redirect alla PDP dinamica canonica)** — più sicura e senza dettagli che si possano sclerotizzare; per le collezioni la **strategia 2 (loader dinamico)**, che mantiene gli URL `/collections/…` e l'esperienza editoriale.

**`productsData.js` non è più una fonte di verità a runtime:** non è caricato da nessuna pagina cliente. `catalog-loader.js` ri-pubblica `window.PRODUCTS` dall'API, così nessun consumatore legacy può divergere dal DB.

**Aggiornamento automatico:** un prodotto creato/modificato/eliminato dall'admin (con immagini) appare/cambia/sparisce su shop, collezione, ricerca e PDP al refresh — senza passaggi manuali.

**Verifica:** vedi `MEMI-Backend/test/` (integrazione + immagini) e `e2e/` (Playwright, round‑trip end‑to‑end); più la sezione [7] del `smoke-test.sh`.

---

## 5. Gestione ordini — ✅ Ciclo di vita completo

**Stato:** ✅ Implementato (Giugno 2026)

Flusso completo quando un cliente fa un ordine:
1. Stripe addebita la carta tramite PaymentIntent
2. `MemiAPI.orders.place()` → `POST /api/orders` verifica il PaymentIntent
3. Ordine salvato in DB (`orders` + `order_items`)
4. Inventario scalato per ogni variante ordinata (`UPDATE product_sizes SET stock = stock - qty`)
5. Email di conferma inviata al cliente (`email.js` + nodemailer)
6. L'admin vede il nuovo ordine nella vista Ordini (dati reali)

---

## 6. Email e notifiche — ✅ Implementato completamente

**Stato:** ✅ Tutte le email implementate (Giugno 2026)

| Funzione | Trigger | Stato |
|---|---|---|
| Conferma ordine | `POST /api/orders` (dopo acquisto) | ✅ |
| Spedizione + tracking | `PUT /api/orders/admin/:id/ship` | ✅ |
| Benvenuto alla registrazione | `POST /api/auth/register` | ✅ |
| Reset password | `POST /api/auth/forgot-password` | ✅ |

- Tutte le funzioni sono in `src/email.js` — esportate singolarmente
- Silenziosamente non-operative se `SMTP_USER` non impostato
- Flusso reset password: JWT a 1 ora → `reset-password.html` frontend → `POST /api/auth/reset-password`
- Newsletter: `POST /api/newsletter/subscribe` salva in tabella `newsletter_subscribers`

**Env vars richiesti:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

---

## 7. Autenticazione cliente — ✅ Completo

**Stato:** ✅ Implementato (Giugno 2026)

- Register, login, me, updateMe — tutti funzionanti con JWT
- Email di benvenuto inviata alla registrazione
- Recupero password: `POST /api/auth/forgot-password` → JWT 1h → `reset-password.html` → `POST /api/auth/reset-password`

---

## 8. Tracking ordini — ✅ Parzialmente implementato

**Stato:** ✅ Tracking in account.html (Giugno 2026)

- `account.html` mostra i propri ordini con status badge
- Quando `order_status = 'spedito'` e `tracking_number` esiste, appare il row tracking con corriere + numero
- API `/api/orders/my` già restituisce `tracking_number` e `courier_code`
- Email di spedizione inviata automaticamente quando admin clicca "Spedisci" nel pannello

**Ancora mancanti:**
- Pagina tracking pubblica (senza login) per guest orders
- Timeline visiva dello stato (In attesa → In preparazione → Spedito → Consegnato)
- Gestione resi self-service

---

## 9. Inventario — ✅ Deducibile su acquisto

**Stato:** ✅ Parzialmente implementato (Giugno 2026)

- `product_sizes` table contiene `stock` per variante taglia
- `POST /api/orders` deduce stock per ogni item ordinato: `UPDATE product_sizes SET stock = stock - qty WHERE product_id=? AND taglia=?`
- Ancora mancanti: alert "esaurito" automatico nella UI, blocco acquisto se stock = 0

---

## 10. Upload immagini admin — ✅ Implementato (correzione: la nota precedente era errata)

**Stato:** ✅ Implementato e verificato.

> Questa sezione affermava per errore "Assente". Il codice dice il contrario (vedi `DEPLOYMENT.md` Phase 6). Pipeline reale:

- **Ricezione:** `multer` (memory storage), campo `images`, limite `MAX_UPLOAD_MB` (default 8 MB), max 10 file, solo `image/*` → `MEMI-Backend/src/routes/products.js`.
- **Elaborazione:** `sharp` genera varianti WebP responsive `thumb`/`card`/`full`, auto‑orienta da EXIF, nomi con hash del contenuto (idempotente) → `MEMI-Backend/src/images.js`.
- **Storage:** volume Docker `uploads_data` montato su `UPLOADS_DIR` (`/app/uploads`).
- **Serving:** `express.static` su `GET /api/uploads/<file>` (passa dal proxy nginx `/api`, niente CORS).
- **Endpoint:** `POST /api/products/:id/images` (upload), `DELETE /api/products/:id/images` (rimuove URL + file). Il `images` JSON del prodotto referenzia gli URL.
- **Admin UI:** `AdminAPI.products.uploadImages()` (FormData) in `MEMI/js/admin-api.js`.
- **Verifica:** test immagini in `MEMI-Backend/test/catalog.test.mjs` (upload → 200 + `content-type: image/webp` → referenziato nel JSON) e sezione [7] di `smoke-test.sh`.

---

## 11. Pagine orfane o incomplete

| Pagina | Problema | Stato |
|---|---|---|
| `campagne.html` | Orfa​na | ✅ Redirect a editoriali.html via meta-refresh |
| `account.html` | Esisteva senza tracking | ✅ Ora mostra tracking spedizione |
| `size-guide.html` | Non esisteva | ✅ Creata con tabelle IT/EU/FR/UK/US |
| `reset-password.html` | Non esisteva | ✅ Creata (flusso reset password) |
| `order-tracking.html` | Non esiste (guest tracking) | ❌ Ancora mancante |
| `returns.html` | Non esiste | ❌ Ancora mancante |
| `product.html` (root) | Orfa​no, query param ?id= | ❌ Ancora orfano |

---

## 12. Recensioni prodotto — Assenti

**Stato:** ❌ Non implementato

Nessuna sezione recensioni nelle schede prodotto. Mancano:
- UI per lasciare recensione
- Backend per salvarle
- Moderazione admin

---

## 13. Sincronizzazione `productsData.js`

**Stato:** ⚠️ Rischio

✅ **Risolto (Giugno 2026).** `productsData.js` è stato **abbandonato come fonte di verità a runtime**: nessuna pagina cliente lo carica. Tutte le superfici leggono dall'API e `catalog-loader.js` ri-pubblica `window.PRODUCTS` dal DB, eliminando ogni possibilità di drift. Il file resta solo come input opzionale per gli script di build `scripts/generate-*.js` (ora superflui).

---

## 14. Problemi tecnici minori

- **`app.js` versioning:** `?v=9` nei file HTML — aggiornare se si modifica app.js. Il catalogo dinamico è in `catalog-loader.js?v=1` (file separato), quindi non ha richiesto modifiche a `app.js`.
- **Immagini:** upload admin implementato (sharp→WebP, `/api/uploads/…`); i prodotti seed usano ancora placeholder Unsplash finché non si caricano immagini reali.
- **SEO:** ✅ index.html e shop.html hanno og:tags + JSON-LD; le PDP statiche `products/{slug}/` ora reindirizzano alla PDP dinamica (`noindex` + `canonical`).
- **Performance:** tutte le superfici catalogo caricano da API; `productsData.js` non più caricato a runtime da nessuna pagina.
- **Admin mobile:** ✅ `MEMI/css/style.css` ha breakpoint 600px (bottom nav) + 600–920px (collapsed sidebar)
- **Newsletter:** ✅ `POST /api/newsletter/subscribe` + tabella DB; il form footer di shop.html è cablato; altri footer (iniettati da app.js) ancora non cablati

---

## Priorità suggerite

### ✅ Sprint 1 — Risolto (Giugno 2026)
1. ~~Pagamenti reali (Stripe)~~ → **✅ Stripe Elements + PaymentIntent**
2. ~~Salvataggio ordini nel backend~~ → **✅ orders.js completo**
3. ~~Email conferma ordine~~ → **✅ nodemailer in email.js**
4. ~~Autenticazione cliente~~ → **✅ JWT implementato**
5. ~~Admin dati reali~~ → **✅ _origRenderView pattern**
6. ~~Inventario deducibile~~ → **✅ stock decrementato su acquisto**

### ✅ Sprint 2 — Risolto (Giugno 2026)
7. ~~Catalogo dinamico shop.html~~ → **✅ API-driven con initShopCatalog()**
8. ~~Email spedizione con tracking~~ → **✅ sendShippingConfirmation()**
9. ~~Recupero password~~ → **✅ forgot/reset con JWT 1h + reset-password.html**
10. ~~Email di benvenuto~~ → **✅ sendWelcomeEmail() su register**
11. ~~Tracking ordini in account~~ → **✅ courier + tracking_number visualizzati**
12. ~~Newsletter backend~~ → **✅ POST /api/newsletter/subscribe + tabella DB**
13. ~~Guida taglie~~ → **✅ size-guide.html creata**
14. ~~SEO meta tags~~ → **✅ og:tags + JSON-LD su index/shop/PDP**
15. ~~Admin mobile~~ → **✅ breakpoint 600px bottom nav in style.css**

### 🟠 Prossimo sprint — ancora mancanti
- Catalogo dinamico per le 15 collections/ (ancora statiche)
- Upload immagini nel pannello admin (campo `images` JSON va impostato manualmente)
- Tracking pubblico guest (senza login) — `order-tracking.html`
- Gestione resi self-service
- Recensioni prodotto (UI + backend + moderazione)
- SEO per i rimanenti 22 PDP (copiare template da vestito-lino-cannes)
- Newsletter nell'header/footer iniettato da app.js (ora solo shop.html è cablato)
