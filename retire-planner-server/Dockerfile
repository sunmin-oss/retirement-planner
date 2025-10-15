# Node.js server for retire-planner-server
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm install --no-audit --no-fund
COPY src ./src
EXPOSE 5178
CMD ["node", "src/server.js"]
