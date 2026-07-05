# ── Build stage: automatic content-hash cache-busting ──────────────
# Rewrites ?v=... on js/app.js, js/admin-api.js, css/style.css (and any other
# local asset referenced from HTML) to a content hash, so browsers always get
# fresh assets after a real change and nobody bumps ?v=N by hand.
# The script never throws; `|| echo` is belt-and-suspenders so a build
# can never fail here.
FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN node scripts/cache-bust.js . || echo "cache-bust skipped"

# ── Serve stage ────────────────────────────────────────────────────
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app /usr/share/nginx/html
EXPOSE 80
