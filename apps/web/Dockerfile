FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx nx build web

EXPOSE 3005

CMD ["npx", "nx", "start", "web", "--port", "3005"]
