# syntax=docker/dockerfile:1
#
# CampusRide — full-stack container image.
#  - Stage 1 builds the React/Vite client into static assets.
#  - Stage 2 runs the Express API, which ALSO serves those static assets,
#    so a single container serves the whole app on port 5000.
#
# Vite inlines VITE_* values at BUILD time, so they are passed as build args
# (docker-compose supplies them from the project-root .env file).

############ Stage 1 — build the client ############
FROM node:20-alpine AS client-build
WORKDIR /app/client

ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_STORAGE_BUCKET=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_GOOGLE_MAPS_API_KEY=""
ARG VITE_COLLEGE_NAME="Sambhram Institute of Technology"
ARG VITE_USN_PREFIX="1ST"
ARG VITE_ADMIN_EMAILS=""
ARG VITE_DEMO_MODE=""
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_COLLEGE_NAME=$VITE_COLLEGE_NAME \
    VITE_USN_PREFIX=$VITE_USN_PREFIX \
    VITE_ADMIN_EMAILS=$VITE_ADMIN_EMAILS \
    VITE_DEMO_MODE=$VITE_DEMO_MODE

COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build


############ Stage 2 — Node/Express runtime ############
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/server

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY server/ ./

# The built SPA must sit at ../../client/dist relative to server/src/index.js,
# i.e. /app/client/dist.
COPY --from=client-build /app/client/dist /app/client/dist

ENV PORT=5000
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "src/index.js"]
