# --- build the static site -------------------------------------------------
# Runs `vite build` against the LOCAL public/ (the curated runtime assets — the
# room FBX + panorama). The 9.5GB records/ and the heavy source textures in
# assets/ are excluded via .dockerignore (they're source, not runtime).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx vite build

# --- serve the static dist/ with Caddy -------------------------------------
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 80
