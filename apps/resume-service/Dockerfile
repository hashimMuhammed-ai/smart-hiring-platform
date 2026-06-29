FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx nx build resume-service

EXPOSE 3001

CMD ["node", "apps/resume-service/dist/main.js"]
