FROM node:24-alpine
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN chown -R node:node /app
USER node
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
