# ---------- build stage ----------
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---------- runtime stage ----------
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

# Write actions stay OFF unless explicitly enabled at runtime.
ENV ALLOW_WRITE_ACTIONS=false

# The server speaks MCP over stdio.
CMD ["node", "dist/index.js"]
