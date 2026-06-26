# Project: MEMI Abbigliamento

E-commerce platform, three apps in one repo, Italian-language product/UI.

## Structure
- `Memi Abbigliamento/` — storefront. **Static** HTML/CSS/JS (nginx). Products are
  hardcoded in HTML for SEO/speed; the API is used only for runtime actions
  (auth, orders, payments, newsletter, discounts, shipping zones).
- `MEMI/` — admin panel. jQuery SPA, single `dashboard.html`. Loads real data via
  the `_origRenderView` override pattern (intercepts `renderView(name)`, fetches
  from API, populates `DATA`, then calls the original renderer; falls back to mock
  data on API failure).
- `MEMI-Backend/` — Node.js/Express + MySQL 8 (`mysql2/promise` pool).
  Routes in `src/routes/`, email in `src/email.js`, DB pool in `src/db/index.js`,
  schema in `src/db/schema.sql`, Stripe in `src/routes/payments.js`.

## Commands
- **Run full stack (local):**
  `docker compose -f docker-compose.yml -f docker-compose.local.yml up --build`
  (add `-d` for background). Ready when logs show `MEMI API running on port 3000`
  and `Core schema ensured`.
- Stop: `docker compose down` — Reset DB to seed state: `docker compose down -v`
- Backend logs: `docker compose logs -f backend`
- Re-init DB inside container: `docker exec <backend-container> node src/db/init.js`
- Backend only, no Docker: `cd MEMI-Backend && npm install && npm run db:init && npm start`
- **Smoke test (verification loop): `./scripts/smoke-test.sh`** — must pass before
  anything is considered done. See "Definition of done".

## Local URLs & credentials
- Shop: http://localhost:8080 — Admin: http://localhost:8081 — API: http://localhost:3000
- MySQL: localhost:3307 (inspection only)
- Default admin: `admin@memi.it` / `memi2026admin` (seeded on fresh volume)
- Health: `curl http://localhost:3000/health` → `{"status":"ok",...}`

## How the pieces talk
- Frontend resolves API base from `<meta name="memi-api" content="/api">`. nginx
  proxies `/api/*` to `backend:3000`, so it's same-origin (no CORS in prod).
  Running raw files without Docker: set meta to `http://localhost:3000/api`.
- Storefront search uses `window.PRODUCTS` from `productsData.js`. Cart/wishlist
  live in localStorage (`memi_cart`, `memi_wishlist`, `memi_token`, `memi_session`).
- Admin token in localStorage as `memi_admin_token`.

## Env behavior — local dev needs ZERO secrets
- Missing `JWT_SECRET` / `JWT_ADMIN_SECRET` → backend **fails fast on boot** (by design).
  Docker compose supplies dev defaults, so it boots fine locally.
- Missing `STRIPE_SECRET_KEY` → `/api/payments/create-intent` returns **503** (no crash).
- Missing `SMTP_USER` → all emails are **silent no-ops** (never throw).
So Stripe/SMTP can stay unset for most work; don't add fake keys to make them "work".

## Gotchas (these waste hours if missed)
- **Cache busting:** `app.js` is referenced with `?v=N`. Storefront: ~56 HTML files;
  admin: `dashboard.html`. nginx serves JS as `immutable`. **If you edit `app.js`,
  bump `?v=N` everywhere it's referenced or changes won't show.** Then hard-refresh.
- **`productsData.js` is a static source of truth** for search/cart/wishlist and is
  NOT auto-synced with the DB. Editing the catalog in admin does not update it.
- **Static `collections/` pages** (and `best-seller.html`, `estate-2025.html`,
  `products/{slug}/`) have hardcoded card counts that drift from the real catalog.
  `scripts/generate-collections.js` / `generate-products.js` regenerate them from
  `productsData.js`. The mega-menu *Shop* links go to dynamic `/shop?categoria=…`;
  many other links still go to static `/collections/…` — hence inconsistent counts.
- **Schema self-heals on boot** via `db/migrations.js → ensureSchema()`
  (`CREATE TABLE IF NOT EXISTS`, structural only). **Seed data** only loads on a
  fresh volume (`initdb.d`) or `npm run db:init`. If list endpoints 500 with
  "table missing", restart the backend.

## Definition of done
1. `docker compose ... up --build` comes up with no errors in backend logs.
2. `./scripts/smoke-test.sh` exits 0.
3. New backend route → add an assertion to `scripts/smoke-test.sh` AND a row to
   `integrations.md` route map.
4. Touched `app.js` → bump `?v=N` everywhere.
5. Summarize what changed, what was tested, and any assumption made.

## Ask before / don't touch
- Production env files; real `STRIPE_*` / `SMTP_*` keys; production DB passwords.
- Destructive `schema.sql` changes (drops/renames) — propose a migration first.
- Don't commit secrets. Don't `down -v` against anything but local.

## Trust the code over the docs when they disagree
The uploaded docs have drift. Example: `GAPS-ANALYSIS.md §10` says product image
upload is **not implemented**, but `DEPLOYMENT.md` "Phase 6 note" says it **is**
(sharp/multer, `uploads_data` volume, `/api/uploads/...`, `MAX_UPLOAD_MB`). Before
building or "fixing" a feature, grep the actual code to confirm current state — don't
trust a single doc.
