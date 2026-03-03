# Changelog - Vilpack Bot

## [0.3.3] - 2026-03-03
### Corrigido
- **UI/UX Chat (SmartChat):**
    - Atualização da mensagem inicial de boas-vindas para a persona "Vik".
    - Ajuste no cabeçalho do chat: Título "Vik" e subtítulo "Consultora de Embalagens".
    - Melhoria de usabilidade: O campo de texto agora recupera o foco automaticamente após o envio da mensagem.

## [0.3.2] - 2026-03-03
### Adicionado
- **Persona Vik:**
    - Atualização do prompt do sistema para definir a IA como "Vik", assistente feminina e simpática.
    - Implementação de mensagem de boas-vindas personalizada ("Olá! Eu sou a Vik...").
    - Atualização da interface do chat para exibir "Vik - Assistente Vilpack".
    - Correção do endpoint da API do chat para usar variável de ambiente.

## [0.3.1] - 2026-03-03
### Adicionado
- **Infraestrutura:**
    - Configuração de HTTPS/SSL no `nginx.conf` utilizando certificados Let's Encrypt.
    - Redirecionamento automático de HTTP (80) para HTTPS (443).
    - Atualização do `docker-compose.yml` para expor a porta 443 e mapear volumes de certificados.

## [0.3.0] - 2026-03-03
### Adicionado
- **White-label & SEO:**
    - Atualização do `index.html` com título e meta tags da Vilpack.
    - Novo Favicon (`favicon.svg`) e remoção de referências ao boilerplate antigo.
    - Redirecionamento do "Portal do Representante" para o Login Admin.
- **Segurança Admin:**
    - Tabela `AdminUser` com suporte a roles (`MASTER`, `VIEWER`).
    - Autenticação JWT com senha hasheada (`bcryptjs`).
    - Seed automático de usuário Master (`admin`).
- **Painel Administrativo:**
    - Login funcional com validação segura.
    - Telas de Leads e Catálogo integradas à API.
    - Upload de imagens de produtos via `multer`.

## [0.2.5] - 2026-02-27
### Alterado
- **UI/UX Frontend:**
    - `HeroCarousel`:
        - Barra de progresso atualizada para estilo "Ghost" (sutil, centralizada, transparente com blur).
        - Remoção da barra de progresso amarela de largura total.
    - `App`:
        - Remoção temporária do ícone flutuante de Carrinho de Compras (`CartSidebar`).
        - Foco total na interação via Chat Bot (`SmartChat`).
- **Backend / Dados:**
    - `Seed`:
        - Remoção temporária de todas as imagens de produtos (`imageUrl: null`) para corrigir problemas de visualização.
        - Produtos agora exibem placeholder padrão ou ficam sem imagem até nova atualização.

## [0.2.4] - 2026-02-27
### Melhorado
- **UI/UX Frontend (Header & Hero):**
    - `Navbar`: Refatorado para estilo **Glassmorphism** (transparente com blur), posição fixa (`fixed top-0`) e texto branco para contraste sobre imagens.
    - `HeroCarousel`:
        - Altura ajustada para **100vh** (Tela Cheia).
        - Orientação alterada para **Vertical** (`axis: 'y'`) com transição suave de cima para baixo.
        - Conteúdo centralizado (`text-center`, `items-center`) e ajustado (`pt-20`) para respeitar o header fixo.
        - Transição de slides configurada para `slide` vertical.
    - `Layout`: Header agora sobrepõe o Carrossel, criando uma experiência imersiva de "Background Slider".

## [0.2.3] - 2026-02-27
### Corrigido
- **UI/UX Frontend:**
    - `HeroSection`: Removido padding superior (`pt-4 md:pt-12` -> `pt-0`) para eliminar faixa branca entre componentes.
    - `HeroCarousel`: Ajuste de margem negativa (`-mb-1`) e gradiente para transição imperceptível.
    - Layout: Confirmada restauração das ilustrações geométricas originais no Hero.

## [0.2.2] - 2026-02-27
### Melhorado
- **UI/UX Frontend:**
    - Refatoração da Hero Section: Separação em `HeroCarousel` e `HeroSection`.
    - `HeroCarousel`: Adicionado gradiente de transição (fade-out) e alinhamento de texto à esquerda.
    - `HeroSection`: Restaurada a seção original estática abaixo do carrossel.
    - Ajuste de posicionamento na Home (`Index.tsx`).

## [0.2.1] - 2026-02-27
### Corrigido
- **Frontend:**
    - Instalação das dependências `embla-carousel-react` e `embla-carousel-autoplay` faltantes.
    - Correção do erro de importação no `HeroSection.tsx`.

## [0.2.0] - 2026-02-27
### Adicionado
- **Persistência de Chat (Fase 2):**
    - Tabela `Message` no banco de dados.
    - `aiService` agora busca histórico de mensagens (últimas 20) por `sessionId`.
    - Histórico injetado no contexto do Gemini para manter coerência na conversa.
    - Mensagens de usuário e IA salvas automaticamente em transação.
- **Auditoria de Sistema:**
    - Script `audit-full.ts` para testes de integração end-to-end.
    - Cobertura: Health Check, Loja, Sessão, Chat com Memória, Produtos com Imagens, Tratamento de Erros.
- **Correções de Bugs:**
    - Correção de validação de `sessionId` no `sessionController`.
    - Correção de tipagem no `cartService` (array `results`).
    - Ajuste de rota `/api/sessions` para `/api/session` (singular).
    - Validação de array vazio no reorder.

## [0.1.0] - 2026-02-27
### Adicionado
- **Banco de Dados e Imagens (Fase 1):**
    - Campo `imageUrl` no schema Prisma (`Product`).
    - Seed atualizado com produtos reais e URLs de imagens (Unsplash).
    - Migração executada (`npx prisma db push`).
