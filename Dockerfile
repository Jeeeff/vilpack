# Stage 1: Build
# node_modules é copiado do contexto (instalado no host antes do build)
FROM node:20-alpine as build
WORKDIR /app
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
