FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend ./
COPY database /app/database

EXPOSE 3000

CMD ["sh", "-c", "npm run migrate && npm run dev"]
