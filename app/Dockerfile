FROM node:20-slim

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 8081

# Run Expo in web mode
CMD ["npx", "expo", "start", "--web", "--port", "8081", "--no-dev", "--https"]
