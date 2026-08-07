FROM node:24-alpine AS build
WORKDIR /app
COPY notifications/package*.json ./
RUN npm ci
COPY notifications/ ./
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY notifications/package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
RUN chown -R node:node /app
USER node
CMD ["node", "dist/src/index.js"]
