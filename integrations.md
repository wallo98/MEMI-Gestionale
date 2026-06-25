# MEMI Integrations
How the e-commerce, admin, and backend connect.

---

## E-commerce ↔ Backend

The e-commerce site (`Memi Abbigliamento/`) is a **static HTML/CSS/JS** site. Products are hardcoded in HTML for fast page loads and SEO. The backend API is used for runtime interactions only.

### What uses the API

| Feature | API Call | File |
|---------|----------|------|
| Register | `POST /api/auth/register` | app.js → `authRegister()` |
| Login | `POST /api/auth/login` | app.js → `authLogin()` |
| Account profile | `GET /api/auth/me` | account.html |
| Update profile | `PUT /api/auth/me` | account.html |
| My orders | `GET /api/orders/my` | account.html |
| Validate discount | `POST /api/orders/validate-discount` | checkout.html |
| **Create PaymentIntent** | `POST /api/payments/create-intent` | checkout.html (Stripe flow, step 1) |
| Place order | `POST /api/orders` | checkout.html (after Stripe confirms, step 2) |
| Shipping zones | `GET /api/shipping/zones` | checkout.html |

### What does NOT use the API (static)

- Product catalog (shop.html, collections/) — hardcoded HTML
- Product detail pages (products/{slug}/index.html) — data-attributes in HTML
- Search (search.html) — uses `window.PRODUCTS` from `productsData.js`
- Cart, wishlist — stored in localStorage (`memi_cart`, `memi_wishlist`)

### JavaScript flow

```
HTML page loads
  → tokens.css, shop.css, app.css (styles)
  → [productsData.js] (only on search.html — sets window.PRODUCTS)
  → api-client.js (sets window.MemiAPI)
  → app.js?v=7 (init() → injectMarkup → bindEvents → updateAuthUI)
```

### Stripe checkout flow

```
checkout.html
  → Stripe.js (cdn.stripe.com)
  → mountCardElement() → CardElement rendered in #card-element div
  → user clicks "Paga"
  → POST /api/payments/create-intent → { client_secret, payment_intent_id }
  → stripe.confirmCardPayment(client_secret, { payment_method: { card: cardElement } })
  → on success: MemiAPI.orders.place({ ...orderData, payment_intent_id })
  → on failure: show Italian error message to user
```

`app.js` replaces `data-include="site-header"` and `data-include="site-footer"` placeholders with the full nav/footer HTML via `injectHeader()` and `injectFooter()`.

---

## Admin ↔ Backend

The admin panel (`MEMI/`) is a **jQuery SPA** with a single `dashboard.html` page. Views are rendered in-memory by `js/app.js`.

### Data flow

```
dashboard.html loads
  → jQuery (CDN)
  → js/admin-api.js (sets window.AdminAPI, reads meta[name="memi-api"])
  → js/app.js (SPA: renders views, wires events)
      → loadDashboardData() on init
          → AdminAPI.dashboard.kpis()
          → AdminAPI.dashboard.recentOrders()
```

### AdminAPI → Backend route map

| AdminAPI call | Backend endpoint |
|--------------|-----------------|
| `auth.login()` | `POST /api/admin/auth/login` |
| `auth.me()` | `GET /api/admin/auth/me` |
| `dashboard.kpis()` | `GET /api/admin/dashboard/kpis` |
| `dashboard.chart()` | `GET /api/admin/dashboard/chart` |
| `dashboard.topProducts()` | `GET /api/admin/dashboard/top-products` |
| `dashboard.recentOrders()` | `GET /api/admin/dashboard/recent-orders` |
| `products.listAll()` | `GET /api/products?status=all` |
| `products.create()` | `POST /api/products` |
| `products.update()` | `PUT /api/products/:id` |
| `products.delete()` | `DELETE /api/products/:id` |
| `products.updateStock()` | `PUT /api/products/:id/stock` |
| `orders.list()` | `GET /api/orders/admin/list` |
| `orders.get()` | `GET /api/orders/admin/:id` |
| `orders.updateStatus()` | `PUT /api/orders/admin/:id/status` |
| `orders.ship()` | `PUT /api/orders/admin/:id/ship` |
| `customers.list()` | `GET /api/admin/customers` |
| `customers.get()` | `GET /api/admin/customers/:id` |
| `customers.update()` | `PUT /api/admin/customers/:id` |
| `customers.delete()` | `DELETE /api/admin/customers/:id` |
| `discounts.list()` | `GET /api/admin/discounts` |
| `discounts.create()` | `POST /api/admin/discounts` |
| `discounts.update()` | `PUT /api/admin/discounts/:id` |
| `discounts.delete()` | `DELETE /api/admin/discounts/:id` |
| `shipping.zones()` | `GET /api/shipping/zones` |
| `shipping.couriers()` | `GET /api/shipping/couriers?all=1` |
| `shipping.shipments()` | `GET /api/shipping/shipments` |
| `shipping.updateShipment()` | `PUT /api/shipping/shipments/:id` |

### API base URL resolution

`admin-api.js` reads `<meta name="memi-api" content="/api">` from `dashboard.html`.  
Since admin nginx proxies `/api/*` to the backend, this works without any environment variable.  
In development (running files locally without Docker), set the meta content to `http://localhost:3000/api`.

---

## Backend ↔ Stripe

`src/routes/payments.js` uses the official `stripe` Node.js SDK:
- Requires `STRIPE_SECRET_KEY` env var
- Creates PaymentIntents with `stripe.paymentIntents.create()`
- `orders.js` verifies PaymentIntents with `stripe.paymentIntents.retrieve()` before saving orders

## Backend ↔ SMTP (Email)

`src/email.js` uses `nodemailer`:
- Creates transport from `SMTP_*` env vars on first call
- `sendOrderConfirmation(order)` builds branded HTML email and sends async
- Errors are logged but never thrown — safe to call in any context

## Backend ↔ Database

Backend uses **mysql2/promise** connection pool (configured in `src/db/index.js`).  
Pool settings: connectionLimit=10, connectTimeout=10s.

The schema is defined in `src/db/schema.sql`. To re-initialize:
```bash
docker exec <backend-container> node src/db/init.js
```

---

## localStorage Keys (E-commerce)

| Key | Type | Contents |
|-----|------|---------|
| `memi_token` | string | Customer JWT (set by api-client.js) |
| `memi_session` | JSON string | `{email, name}` for fast UI reads |
| `memi_cart` | JSON string | `[{id, name, variant, price, color, qty}]` |
| `memi_wishlist` | JSON string | `[{id, name, variant, price, color}]` |

---

## localStorage Keys (Admin)

| Key | Type | Contents |
|-----|------|---------|
| `memi_admin_token` | string | Admin JWT |
