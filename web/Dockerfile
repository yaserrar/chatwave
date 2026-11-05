# syntax=docker/dockerfile:1
# Build from the web folder: docker build -f web/Dockerfile web

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# The postinstall script patches iconsax-react, so it must exist before npm ci.
COPY scripts ./scripts
RUN npm ci
COPY . .
RUN npm run build

# Static files only. /api never reaches this container: Traefik sends it to the API.
FROM nginx:1.29-alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
