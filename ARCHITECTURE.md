# 🏛️ Arquitetura de Software - Vilpack Site 2026

Este documento descreve a arquitetura de alto nível do sistema Vilpack, detalhando componentes, fluxo de dados e decisões de design. Destina-se a arquitetos de software e desenvolvedores sêniores.

---

## 1. Diagrama de Contexto (C4 Level 1)

O sistema Vilpack interage com três atores principais: o Cliente Final, a IA Generativa (Google Gemini) e o Banco de Dados.

```mermaid
graph TD
    User[Cliente Final] -->|HTTPS (443)| Frontend[Frontend SPA (React)]
    Frontend -->|JSON / REST| Backend[Backend API (Node.js/Express)]
    Backend -->|SQL| DB[(PostgreSQL)]
    Backend -->|API Call| Gemini[Google Gemini AI]
    Backend -->|Link| WhatsApp[WhatsApp Vendedor]
```

---

## 2. Componentes do Sistema (C4 Level 2)

### 2.1. Frontend (`/src`)
*   **Responsabilidade:** Interface do usuário, renderização do catálogo e gestão do chat.
*   **Padrão:** Single Page Application (SPA).
*   **Servidor:** Nginx (Container Docker).
    *   **Porta 80:** Redirecionamento para HTTPS.
    *   **Porta 443:** SSL/TLS via Let's Encrypt.
*   **Estado:** Gerenciado via React Hooks (`useState`, `useEffect`) e Context API.
*   **Comunicação:** `fetch` API para comunicação com o backend.
*   **Componentes Chave:**
    *   `SmartChat`: Gerencia a janela de chat, histórico local e chamadas à API de IA.
    *   `HeroCarousel`: Apresentação visual (Landing Page).
    *   `App.tsx`: Roteamento e layout base.

### 2.2. Backend (`/vilpack-bot-backend`)
*   **Responsabilidade:** Regras de negócio, persistência de dados e orquestração da IA.
*   **Padrão:** MVC (Model-View-Controller) adaptado para API (Controller-Service-Repository).
*   **Persona da IA:** "Vik" - Assistente virtual feminina, simpática e consultiva.
*   **Camadas:**
    1.  **Routes:** Definição de endpoints (incluindo `/api/admin` protegido).
    2.  **Controllers:** Validação de input (Zod) e tratamento HTTP.
    3.  **Services:** Lógica de negócio pura (ex: `aiService`, `cartService`).
    4.  **Prisma Client:** Acesso a dados (ORM).
    5.  **Auth:** Middleware JWT e Bcypt para proteção de rotas administrativas.

### 2.3. Banco de Dados (PostgreSQL)
*   **Schema:** Relacional normalizado.
*   **Tabelas Principais:** `Store`, `Product`, `Category`, `Session`, `Message`, `Cart`, `Order`, `AdminUser`.
*   **Estratégia de Sessão:** `Session` é a entidade central que amarra o usuário anônimo ao seu carrinho e histórico de chat.

---

## 3. Decisões Arquiteturais (ADRs)

### ADR-004: Autenticação Administrativa
*   **Contexto:** Necessidade de proteger o painel de gerenciamento (Leads, Catálogo).
*   **Decisão:** Implementar autenticação baseada em **JWT (JSON Web Tokens)** com senhas hasheadas via **bcrypt**.
*   **Justificativa:** Padrão de mercado seguro e stateless, ideal para SPAs. Permite fácil expansão para múltiplos níveis de acesso (Roles) sem manter estado de sessão no servidor.

### ADR-001: Chat-First Experience
*   **Contexto:** O objetivo é simular uma venda consultiva, não apenas um catálogo self-service.
*   **Decisão:** Priorizar o componente de Chat em detrimento do Carrinho tradicional na UI. O carrinho existe no backend, mas a interação primária é via conversa.
*   **Consequência:** A UI foi simplificada para remover o ícone de carrinho flutuante, focando a atenção no botão de chat.

### ADR-002: RAG Simplificado (Retrieval-Augmented Generation)
*   **Contexto:** Precisamos que a IA conheça os produtos da loja.
*   **Decisão:** Injetar o catálogo de produtos relevantes (filtrados por loja) diretamente no System Prompt do LLM a cada requisição.
*   **Justificativa:** O catálogo atual é pequeno o suficiente para caber na janela de contexto (1M tokens do Gemini 1.5). Isso evita a complexidade de manter um banco de dados vetorial (Vector DB) nesta fase.
*   **Trade-off:** Custo de tokens por requisição aumenta linearmente com o catálogo. Futuramente, migrar para busca semântica/vetorial se o catálogo crescer muito.

### ADR-003: Persistência de Chat Síncrona
*   **Contexto:** O usuário precisa ver o histórico se recarregar a página.
*   **Decisão:** Salvar cada mensagem (`user` e `assistant`) no PostgreSQL transactionally durante o fluxo de resposta.
*   **Justificativa:** Garante consistência forte. Se a mensagem não for salva, o usuário deve saber que houve erro.

---

## 4. Fluxo de Dados Crítico: Interação com o Bot

1.  **Input:** Usuário digita "Preciso de caixas para pizza" no Frontend.
2.  **Request:** Frontend envia `POST /api/ai/chat` com `sessionId` e `message`.
3.  **Processing (Backend):**
    *   Valida `sessionId`.
    *   Carrega histórico recente (últimas 20 msgs).
    *   Carrega produtos ativos da loja.
    *   Constrói prompt: *System Instruction + Catálogo + Histórico + Nova Pergunta*.
4.  **Inference:** Envia para Google Gemini API.
5.  **Persistência:** Salva pergunta e resposta no DB.
6.  **Response:** Retorna resposta JSON para o Frontend.
7.  **Render:** Frontend exibe resposta (processando Markdown para imagens/negrito).

---

## 5. Considerações de Segurança e Escalabilidade

*   **Rate Limiting:** Não implementado na camada de aplicação (TODO). Recomendado uso de Nginx ou Middleware Express para evitar abuso da API de IA (custo).
*   **Sanitização:** Zod garante que inputs seguem o formato esperado. Prisma protege contra SQL Injection.
*   **Sessão:** Baseada em UUID gerado no cliente/servidor e armazenado em LocalStorage. Não há autenticação de usuário (login/senha) para clientes finais, reduzindo fricção.

---

## 6. Dívida Técnica Conhecida

*   **Imagens:** Atualmente usando URLs externas ou `null`. Necessário implementar upload de arquivos (S3/Blob Storage).
*   **Testes:** Cobertura de testes unitários é baixa. Existem scripts de teste de integração (`audit-full.ts`), mas CI/CD pipeline não está configurado.
