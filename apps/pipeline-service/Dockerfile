FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx nx build pipeline-service

EXPOSE 3003

CMD ["node", "apps/pipeline-service/dist/main.js"]
