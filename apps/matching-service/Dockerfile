FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx nx build matching-service

EXPOSE 3002

CMD ["node", "apps/matching-service/dist/main.js"]
