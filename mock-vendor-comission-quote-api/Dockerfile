FROM node:20-alpine
WORKDIR /repo

COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY mock-vendor-comission-quote-api/package.json mock-vendor-comission-quote-api/package.json
RUN npm ci

COPY shared shared
COPY mock-vendor-comission-quote-api mock-vendor-comission-quote-api

WORKDIR /repo/mock-vendor-comission-quote-api
EXPOSE 4000
CMD ["npm", "start"]
