FROM node:24-alpine AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci

FROM deps AS build

WORKDIR /app

ARG VITE_API_URL
ARG VITE_CSRF_COOKIE_NAME=vox_csrf
ENV VITE_API_URL=${VITE_API_URL} \
    VITE_CSRF_COOKIE_NAME=${VITE_CSRF_COOKIE_NAME}

COPY . .

RUN npm run build

FROM nginx:1.29.7-trixie AS runtime

LABEL authors="ravinder"

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
