# 📦 Vilpack Bot Backend - Documentação Técnica

**Versão:** 1.0.0
**Data da Atualização:** 03/03/2026
**Status:** ✅ Estável / Fase 2 Concluída (Chat-First)

---

## 1. Visão Geral

O **Vilpack Bot Backend** é o núcleo de inteligência e dados da plataforma Vilpack. Ele não apenas fornece uma API para o catálogo de produtos, mas orquestra a interação entre o cliente e o modelo de linguagem (LLM - Google Gemini) para criar uma experiência de "Venda Consultiva".

### Mudança de Paradigma (Fase 2)
Recentemente, a aplicação migrou de um modelo híbrido (Chat + Carrinho Tradicional) para um modelo **Chat-First**.
- **Anterior:** O usuário adicionava itens ao carrinho manualmente via UI.
- **Atual:** O usuário interage com o Bot, que entende a intenção de compra e sugere produtos. O fechamento do pedido é direcionado para atendimento humano via WhatsApp, com o contexto da conversa.

---

## 2. Arquitetura e Tecnologias

*   **Runtime:** Node.js (v20+)
*   **Framework Web:** Express.js v5.2.1
*   **Linguagem:** TypeScript (Strict Mode)
*   **Banco de Dados:** PostgreSQL
*   **ORM:** Prisma v7.4.1
*   **IA:** Google Gemini (`@google/genai`) - Modelo `gemini-1.5-flash`
*   **Validação:** Zod
*   **Segurança:** Helmet, CORS, Sanitização de Inputs

---

## 3. Modelagem de Dados (Prisma Schema)

O banco de dados foi desenhado para suportar multi-tenancy (múltiplas lojas) e persistência de contexto de IA.

### 3.1. Principais Entidades

1.  **Store (`Store`)**
    *   Representa a loja/cliente do sistema.
    *   Campos: `id`, `name`, `slug` (identificador na URL), `whatsapp` (para envio de pedidos).

2.  **Product (`Product`)**
    *   Catálogo de itens vendáveis.
    *   Campos: `id`, `name`, `price`, `description`, `imageUrl` (Nullable), `active`.
    *   *Nota:* `imageUrl` está atualmente definido como `null` em produção aguardando assets finais.

3.  **Category (`Category`)**
    *   Organização dos produtos.
    *   Campos: `id`, `name`, `storeId`.

4.  **Session (`Session`)**
    *   Representa a visita de um usuário anônimo ou identificado.
    *   Campos: `id` (UUID), `storeId`.
    *   *Importante:* É a chave primária para manter o histórico do chat.

5.  **Message (`Message`)**
    *   Histórico da conversa entre Usuário e Bot.
    *   Campos: `id`, `sessionId`, `role` ('user' | 'assistant'), `content`, `createdAt`.

6.  **Cart (`Cart`) & CartItem (`CartItem`)**
    *   Estrutura de carrinho (mantida no backend para uso futuro ou interno do bot).
    *   Relacionamento 1:1 com Session.

7.  **Order (`Order`) & OrderItem (`OrderItem`)**
    *   Registro de pedidos finalizados (preparado para Fase 3).
    *   Campos: `id`, `customerName`, `customerPhone`, `total`, `status`.

---

## 4. Fluxo de Inteligência Artificial (`aiService.ts`)

O serviço de IA é o componente mais complexo e vital.

### 4.1. Processo de Geração de Resposta
1.  **Recebimento:** Backend recebe `sessionId` e `message` do usuário.
2.  **Recuperação de Contexto:**
    *   Busca histórico recente de mensagens (`Message`) no DB.
    *   Busca catálogo de produtos ativos da loja (`Product`).
3.  **Engenharia de Prompt (RAG Simplificado):**
    *   O sistema injeta o catálogo de produtos formatado como texto no "System Prompt" do Gemini.
    *   Instrui o modelo a agir como um consultor de vendas experiente.
    *   Define regras de "Funil de Vendas" (não listar tudo, perguntar necessidade primeiro).
4.  **Inferência:** Envia histórico + prompt para a API do Google Gemini.
5.  **Persistência:** Salva a pergunta do usuário e a resposta da IA na tabela `Message`.
6.  **Resposta:** Retorna a resposta textual para o frontend.

---

## 5. Endpoints da API

### 🤖 IA Chat
*   `POST /api/ai/chat`
    *   **Payload:** `{ sessionId: "uuid", message: "Preciso de sacolas" }`
    *   **Retorno:** `{ reply: "Temos sacolas de papel e plástico..." }`

### 📦 Sessão
*   `POST /api/session`
    *   **Payload:** `{ storeId: "uuid" }` (Opcional se usar slug padrão)
    *   **Retorno:** `{ sessionId: "uuid", ... }`

### 🛒 Carrinho (Legado/Interno)
*   `GET /api/cart/:sessionId`
*   `POST /api/cart/items`
*   `DELETE /api/cart/item/:id`
*   *Nota:* Estes endpoints estão funcionais mas não são chamados pela UI principal na versão atual.

---

## 6. Configuração e Variáveis de Ambiente

O arquivo `.env` deve conter:

```env
# Conexão com Banco de Dados
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Chave da API do Google (AI Studio)
GEMINI_API_KEY="AIzaSy..."

# Porta do Servidor
PORT=3001
```

---

## 7. Scripts Úteis

*   `npm run dev`: Inicia servidor em modo watch.
*   `npx prisma db seed`: Popula o banco com dados iniciais (Loja Demo, Produtos sem imagem).
*   `npx ts-node src/scripts/audit-full.ts`: Roda suite de testes de integração (Health, DB, AI).
