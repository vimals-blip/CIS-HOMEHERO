# Single image for all Node services; each container runs a different command.
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
# Default command runs the monolith; compose overrides per service.
CMD ["node", "server/api.js"]
