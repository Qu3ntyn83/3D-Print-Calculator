# --- Oberfläche bauen ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# --- Laufzeit: Node ohne weitere Abhängigkeiten, Daten in SQLite unter /data ---
FROM node:24-alpine
LABEL org.opencontainers.image.title="3D Print Calculator" \
      org.opencontainers.image.description="Kostenrechner und Angebote für den 3D-Druck" \
      org.opencontainers.image.source="https://github.com/Qu3ntyn83/3D-Print-Calculator" \
      org.opencontainers.image.licenses="MIT"
RUN apk add --no-cache su-exec
ENV NODE_ENV=production PORT=8080 DATA_DIR=/data NODE_NO_WARNINGS=1
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY --from=build /app/dist ./dist
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server/server.mjs"]
