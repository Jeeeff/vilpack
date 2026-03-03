# Vilpack Bot Backend

Backend para o bot de atendimento e pedidos da Vilpack.

> 📚 **Documentação Completa:** Para detalhes técnicos, endpoints, modelos de dados e arquitetura, consulte [DOCUMENTATION.md](./DOCUMENTATION.md) e [ARCHITECTURE.md](../ARCHITECTURE.md) na raiz do projeto.

## Tecnologias

- **Node.js** (Runtime)
- **Express** (Framework Web)
- **PostgreSQL** (Banco de Dados)
- **Prisma** (ORM)
- **Google GenAI SDK** (Integração com Gemini 1.5 Flash)
- **TypeScript** (Linguagem)

## Configuração Rápida

1.  **Instalar dependências:**
    ```bash
    npm install
    ```

2.  **Configurar Variáveis de Ambiente:**
    Crie um arquivo `.env`:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/vilpack_db?schema=public"
    GEMINI_API_KEY="SUA_CHAVE_API_AQUI"
    PORT=3001
    ```

3.  **Banco de Dados:**
    ```bash
    npx prisma migrate dev
    npx prisma db seed
    ```

4.  **Iniciar o Servidor:**
    ```bash
    npm run dev
    ```

## Scripts de Auditoria

- **Auditoria Completa (Health, Chat, DB):**
  ```bash
  npx ts-node src/scripts/audit-full.ts
  ```
