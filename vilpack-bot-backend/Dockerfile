FROM node:20-alpine

WORKDIR /app

# node_modules é copiado do contexto (instalado no host antes do build)
COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
