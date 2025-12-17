FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
COPY pnpm-lock.yaml* ./

RUN pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]