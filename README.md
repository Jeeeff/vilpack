# 📦 Vilpack Site 2026 - Plataforma de Vendas com IA

Bem-vindo à documentação oficial do projeto **Vilpack Site 2026**. Este projeto é uma plataforma de e-commerce moderna focada em embalagens, que utiliza um assistente virtual baseado em Inteligência Artificial (Google Gemini) para guiar o cliente desde a escolha do produto até o fechamento do pedido.

---

## 🏗️ Arquitetura do Sistema

O projeto é dividido em dois grandes monólitos funcionais:

1.  **Frontend (`/src`)**: Aplicação Single Page Application (SPA) construída com **React**, **Vite** e **Tailwind CSS**.
2.  **Backend (`/vilpack-bot-backend`)**: API RESTful construída com **Node.js**, **Express**, **Prisma ORM** e **PostgreSQL**.

### 🛠️ Tech Stack

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Frontend** | React 18 | Biblioteca de UI |
| | Vite | Build tool rápida |
| | Tailwind CSS | Framework de estilização |
| | shadcn/ui | Componentes de UI reutilizáveis |
| | Lucide React | Ícones |
| **Backend** | Node.js (v20+) | Runtime JavaScript |
| | Express.js | Framework Web |
| | Prisma ORM | Acesso a dados e Migrations |
| | PostgreSQL | Banco de dados relacional |
| **IA / ML** | Google Gemini | LLM para o assistente de vendas (`gemini-1.5-flash`) |
| **DevOps** | Docker | Containerização (Opcional) |

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Node.js (v20 ou superior)
- npm ou bun
- PostgreSQL rodando localmente ou via Docker

### 1. Configuração do Backend

Navegue até a pasta do backend e instale as dependências:

```bash
cd vilpack-bot-backend
npm install
```

Configure as variáveis de ambiente. Crie um arquivo `.env` em `vilpack-bot-backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/vilpack_db?schema=public"
GEMINI_API_KEY="sua_chave_api_google_gemini"
PORT=3001
```

Execute as migrações e o seed do banco de dados:

```bash
npx prisma migrate dev
npx prisma db seed
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```
*O backend rodará em `http://localhost:3001`*

### 2. Configuração do Frontend

Na raiz do projeto, instale as dependências:

```bash
npm install
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```
*O frontend rodará em `http://localhost:8080` (ou porta disponível)*

---

## 📂 Estrutura de Pastas

```
/
├── src/                  # Código Fonte do Frontend
│   ├── components/       # Componentes React (UI, Seções, Chat)
│   ├── pages/            # Páginas da aplicação (Index, NotFound)
│   ├── lib/              # Utilitários e configurações
│   └── hooks/            # Hooks customizados
│
├── vilpack-bot-backend/  # Código Fonte do Backend
│   ├── prisma/           # Schema do Banco de Dados e Seeds
│   ├── src/
│   │   ├── controllers/  # Lógica de controle das rotas
│   │   ├── services/     # Regras de negócio (IA, Carrinho)
│   │   ├── routes/       # Definição de endpoints da API
│   │   └── config/       # Configurações globais
│   └── ...
│
├── public/               # Assets estáticos
└── ...
```

---

## ✨ Funcionalidades Principais

### 1. Smart Chat (Assistente Virtual)
- **Consultor de Vendas:** O bot atua como um especialista em embalagens, sugerindo produtos baseados na necessidade do cliente.
- **Contexto de Catálogo:** A IA tem acesso em tempo real aos produtos do banco de dados para fazer recomendações precisas.
- **Persistência:** O histórico da conversa é salvo no banco de dados para manter o contexto.
- **Interface:** Chat flutuante, integrado e responsivo.

### 2. Catálogo de Produtos
- **Visualização:** Produtos exibidos via chat (Markdown com imagens) e em seções do site.
- **Dados:** Nome, Preço, Descrição, Imagem e Categoria.
- **Atualização Recente:** As imagens dos produtos foram temporariamente removidas (definidas como `null`) para evitar links quebrados, aguardando novos assets.

### 3. Fluxo de Pedido (Atualizado)
- **Chat-First:** O carrinho de compras tradicional (ícone e sidebar) foi removido da interface principal.
- **Novo Fluxo:** O cliente monta o pedido conversando com o bot.
- **Finalização:** O bot prepara o resumo e encaminha o pedido para finalização via WhatsApp (Integração humana).

---

## 📝 Documentação Técnica Adicional

- **Backend Docs:** Veja `vilpack-bot-backend/DOCUMENTATION.md` para detalhes dos endpoints e modelos de dados.
- **Changelog:** Veja `CHANGELOG.md` para o histórico de versões e alterações recentes.

---

## 🔮 Próximos Passos (Roadmap)

1.  **Integração WhatsApp:** Automatizar o envio do resumo do pedido do Chat diretamente para o WhatsApp do vendedor.
2.  **Upload de Imagens:** Implementar sistema de armazenamento (S3/MinIO) para imagens reais dos produtos.
3.  **Painel Administrativo:** Interface para cadastro de produtos e visualização de conversas.
