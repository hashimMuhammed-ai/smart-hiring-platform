FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx nx build api-gateway

EXPOSE 3000

CMD ["node", "apps/api-gateway/dist/main.js"]
