FROM node:20-bookworm-slim
WORKDIR /repo

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY temporal-worker/package.json temporal-worker/package.json
RUN npm ci

COPY shared shared
COPY temporal-worker temporal-worker

WORKDIR /repo/temporal-worker
CMD ["npm", "start"]
