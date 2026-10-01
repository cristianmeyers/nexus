FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
# /data appartient à "node" : le volume nommé hérite de ces droits au premier montage
RUN mkdir /data && chown node:node /data
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}
ENV DATA_DIR=/data
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
