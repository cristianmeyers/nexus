FROM node:20-alpine
RUN apk add --no-cache docker-cli docker-cli-compose
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY index.js job.js ./
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
CMD ["node", "index.js"]
