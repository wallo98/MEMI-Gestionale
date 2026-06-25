FROM node:20-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Install dependencies first (layer caching). We use `npm install` (not `npm ci`)
# so newly-added deps (sharp, multer) are reconciled even if the committed
# lockfile predates them. sharp ships prebuilt libvips for linux-musl, so no
# build toolchain is required on Alpine.
COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy source
COPY src/ ./src/

# Create the uploads dir and hand /app to a non-root user. A fresh named volume
# mounted at /app/uploads inherits this ownership, so the app can write to it.
RUN mkdir -p /app/uploads \
 && addgroup -S memi && adduser -S memi -G memi \
 && chown -R memi:memi /app
USER memi

EXPOSE 3000

CMD ["node", "src/server.js"]
