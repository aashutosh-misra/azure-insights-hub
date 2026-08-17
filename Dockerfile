# ---- build ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --legacy-peer-deps
COPY . .
# Build a plain Node.js server bundle (instead of the edge/worker bundle)
ENV NITRO_PRESET=node-server
RUN npm run build

# ---- run ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
