FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js ./
COPY lib ./lib
COPY routes ./routes
COPY public ./public
USER node
EXPOSE 8080
CMD ["node", "server.js"]
