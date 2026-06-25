# MEMI — Gap Analysis Completo
*Aggiornato: Giugno 2026 (post sprint completo)*

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

## 4. Catalogo prodotti — Statico e non sincronizzato

**Stato:** ⚠️ Problema architetturale

Il catalogo (`productsData.js`) è un array JavaScript hardcoded. I prodotti nelle pagine HTML (`shop.html`, `collections/`) sono anch'essi HTML statico.

**Problemi:**
- Aggiungere un nuovo prodotto richiede modificare manualmente sia `productsData.js` che l'HTML della collection
- I prodotti admin non corrispondono al catalogo reale
- Nessuna gestione delle varianti (taglia/colore) a livello di database
- L'inventario non si aggiorna quando viene effettuato un ordine

**Cosa serve:**
- Un database prodotti (es. PostgreSQL o MongoDB)
- Un endpoint `GET /api/products` che restituisce il catalogo
- Il frontend deve caricare i prodotti dinamicamente invece di HTML statico

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

## 6. Email e notifiche — ✅ Parzialmente implementato

**Stato:** ✅ Email di conferma ordine implementata (Giugno 2026)

- Email di conferma ordine → ✅ `sendOrderConfirmation()` in `src/email.js`, triggered da `orders.js`
- Design email: HTML branded con colori Memi, riepilogo articoli, totale, indirizzo di consegna
- Nodemailer + SMTP configurabile tramite env vars (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, ecc.)
- Silent no-op se `SMTP_USER` non impostato — non causa crash in sviluppo

**Ancora mancanti:**
- Email di spedizione con tracking → ❌
- Recupero password → ❌
- Email di benvenuto alla registrazione → ❌
- Newsletter reale → ❌

**Env vars richiesti:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

---

## 7. Autenticazione cliente — Parziale

**Stato:** ⚠️ Frontend presente, backend mancante

Il frontend (`app.js`) ha una modal di login/registrazione con chiamate a `MemiAPI.auth.*`, ma:
- Le route `/api/auth/register` e `/api/auth/login` non esistono nel backend
- Nessuna gestione JWT/sessione lato server
- La persistenza del profilo cliente non esiste
- Il flusso "Recupera password" non è implementato

---

## 8. Tracking ordini — Assente

**Stato:** ❌ Non implementato

Non esiste una pagina `order-tracking.html` o simile. Il cliente dopo l'acquisto non può:
- Vedere lo stato del proprio ordine
- Tracciare la spedizione
- Richiedere un reso

---

## 9. Inventario — ✅ Deducibile su acquisto

**Stato:** ✅ Parzialmente implementato (Giugno 2026)

- `product_sizes` table contiene `stock` per variante taglia
- `POST /api/orders` deduce stock per ogni item ordinato: `UPDATE product_sizes SET stock = stock - qty WHERE product_id=? AND taglia=?`
- Ancora mancanti: alert "esaurito" automatico nella UI, blocco acquisto se stock = 0

---

## 10. Upload immagini admin — Assente

**Stato:** ❌ Non implementato

L'admin non ha un sistema di upload immagini prodotto. Le immagini attuali sono URL Unsplash (placeholder). Per aggiungere prodotti reali servirebbe:
- Un componente upload nel pannello admin
- Storage (es. AWS S3, Cloudinary, o cartella locale)
- Endpoint `POST /api/upload` nel backend

---

## 11. Pagine orfane o incomplete

| Pagina | Problema |
|---|---|
| `campagne.html` | Esiste ma non è linkata da nessun posto nel sito cliente |
| `account.html` | Non esiste — il link "Account" nell'header non ha destinazione funzionante |
| `order-tracking.html` | Non esiste |
| `returns.html` | Non esiste — i resi sono menzionati nell'announcement bar ma non gestiti |
| `size-guide.html` | Menzionata nelle schede prodotto, potrebbe non esistere |

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

Il file `productsData.js` è la "fonte di verità" per cart/wishlist/filtri. Se un prodotto viene modificato nell'admin (quando l'admin avrà un'integrazione reale), il file JS non si aggiornerà automaticamente. Serve un meccanismo di sync o abbandonare il file statico a favore di chiamate API.

---

## 14. Problemi tecnici minori

- **`app.js` versioning:** il parametro `?v=7` nelle script tag va aggiornato manualmente a ogni deploy — nessun hash automatico (aggiornato a v=7 in tutti e 56 i file HTML, Giugno 2026)
- **Immagini:** tutte le immagini prodotto e editorial sono placeholder Unsplash, non foto reali Memi
- **SEO:** le pagine non hanno meta description, og:image, o structured data per prodotti
- **Performance:** nessun lazy loading per `productsData.js` (carica tutto il catalogo anche se l'utente è solo sulla home)
- **Errori CORS:** quando il backend sarà attivo, le origini frontend/backend dovranno essere configurate

---

## Priorità suggerite

### ✅ Critico — Risolto (Giugno 2026)
1. ~~Pagamenti reali (Stripe)~~ → **✅ Stripe Elements + PaymentIntent**
2. ~~Salvataggio ordini nel backend~~ → **✅ orders.js completo**
3. ~~Email conferma ordine~~ → **✅ nodemailer in email.js**
4. Autenticazione cliente funzionante → ✅ JWT implementato

### ✅ Admin — Risolto (Giugno 2026)
5. ~~Collegare admin a dati reali~~ → **✅ _origRenderView pattern**
6. Upload immagini prodotto → ❌ ancora mancante

### 🟠 Importante (esperienza cliente) — prossimo sprint
7. Pagina "I miei ordini" visibile (account.html esiste, JWT funziona)
8. Tracking spedizione cliente-facing
9. Gestione resi
10. Alert "esaurito" in UI (stock in DB esiste)

### 🟢 Qualità e crescita
11. Recensioni prodotto
12. Newsletter reale
13. SEO tecnico
14. Guida taglie
15. Email spedizione + recupero password
