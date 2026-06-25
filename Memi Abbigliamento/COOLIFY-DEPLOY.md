# Deploying Memi Abbigliamento to Coolify on Hetzner

The repo (`kristi2002/Memi-Abbigliamento--1-`, branch `main`) now includes:

- `Dockerfile` — builds a tiny Caddy-based image that serves the site.
- `Caddyfile` — replicates `server.py`'s clean-URL behavior (`/shop` → `shop.html`, directory → `index.html`) plus gzip and cache headers.
- `.dockerignore` — keeps dev-only files out of the image.

These are already committed and pushed to GitHub.

## 1. Create the resource in Coolify

1. Open your Coolify dashboard.
2. Pick the project/server where you want this deployed (your Hetzner server).
3. **New Resource → Application → Public Repository** (or **GitHub App** if you've connected your GitHub account for private repo access).
4. Repository URL: `https://github.com/kristi2002/Memi-Abbigliamento--1-.git`
5. Branch: `main`
6. Build Pack: **Dockerfile** — Coolify should auto-detect it since `Dockerfile` is at the repo root. If it defaults to Nixpacks/static, switch it to Dockerfile manually.
7. Port: **80** (that's what Caddy listens on inside the container; Coolify's proxy maps it to 443/HTTPS automatically).

## 2. Deploy

1. Click **Deploy**. Coolify will clone the repo, build the image, and start the container.
2. Watch the build logs — it should be fast since the image is just `caddy:2-alpine` plus your static files.
3. Once it's running, Coolify gives you a default URL (something like `https://<random>.sslip.io` or your server's domain pattern). Open it and check:
   - Homepage loads
   - `/shop`, `/about`, `/look`, `/checkout` resolve without `.html`
   - A product page like `/products/vestito-lino-cannes/` loads
   - A bad URL shows your custom `404.html`

## 3. Turn on auto-deploy (recommended)

In the resource's **Settings → Webhooks** (or "Automatic Deployment"), enable the GitHub webhook so every push to `main` redeploys automatically. Since Cowork auto-commits and pushes your edits to this repo as you work, this means changes you make here go live without any manual redeploy step.

## 4. Add a custom domain later

When you have a domain:

1. In your DNS provider, add an **A record** pointing the domain (or subdomain) to your Hetzner server's IP address.
2. In Coolify, go to the resource's **Domains** tab and add the domain.
3. Coolify provisions a Let's Encrypt SSL certificate automatically once DNS resolves.

## 5. Backend environment variables (required for full functionality)

When deploying the full stack (backend + e-commerce + admin), add these in Coolify's **Environment Variables** tab for the backend service:

**Database**
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`

**Auth**
- `JWT_SECRET` — 64-char random hex (customer tokens)
- `JWT_ADMIN_SECRET` — 64-char random hex (admin tokens, must differ from JWT_SECRET)

**Stripe (payment processing)**
- `STRIPE_SECRET_KEY` — `sk_live_...` in production, `sk_test_...` for testing
- `STRIPE_PUBLISHABLE_KEY` — `pk_live_...` or `pk_test_...`
- If not set: checkout shows "Servizio pagamenti non disponibile" but site works otherwise

**Email (order confirmation)**
- `SMTP_HOST` — e.g. `smtp.gmail.com`
- `SMTP_PORT` — `587` (STARTTLS) or `465` (SSL)
- `SMTP_SECURE` — `false` for port 587, `true` for 465
- `SMTP_USER` — your sending email address
- `SMTP_PASS` — SMTP password or Google app password
- `SMTP_FROM` — `"Memi Abbigliamento <info@memi.it>"`
- If not set: orders save correctly but no confirmation email is sent

## Notes

- The e-commerce frontend (`Memi Abbigliamento/`) is a static site — no env vars needed for the nginx container itself. All dynamic logic hits the backend via `/api/` proxy.
- `app.js` is currently at version `?v=7`. Always bump this version in all HTML files after modifying `app.js`.
