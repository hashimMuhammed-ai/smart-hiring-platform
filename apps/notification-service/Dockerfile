FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx nx build notification-service

EXPOSE 3004

CMD ["node", "apps/notification-service/dist/main.js"]
