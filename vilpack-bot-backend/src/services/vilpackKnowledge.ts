/**
 * vilpackKnowledge.ts
 *
 * BASE DE CONHECIMENTO COMERCIAL ESTÁTICA DA VILPACK
 * ───────────────────────────────────────────────────
 * Substitui a dependência de leitura do banco de dados como fonte primária
 * de contexto do bot. O banco é consultado APENAS para detalhe de SKU específico.
 *
 * CAMADA A — Lista de categorias (sempre no prompt, ~40 tokens)
 * CAMADA B — Resumo comercial da categoria detectada (~60-100 tokens por categoria)
 * CAMADA C — Query no banco sob demanda (só quando cliente pede detalhe específico)
 *
 * Para adicionar ou atualizar categorias: editar este arquivo.
 * Não requer migration de banco de dados.
 */

export interface CategoryKnowledge {
  /** Nome canônico da categoria (como está no banco) */
  name: string;
  /** Palavras-chave que disparam detecção desta categoria na mensagem do cliente */
  triggers: string[];
  /** Resumo comercial: o que é, para que serve, diferenciais — 2-3 linhas */
  summary: string;
  /** Aplicações / segmentos que costumam comprar */
  applications: string;
  /** Dica comercial para o atendimento */
  salesNote: string;
}

/**
 * Catálogo de conhecimento — uma entrada por categoria.
 * Os `triggers` usam palavras-raiz normalizadas (sem acento, lowercase).
 * A detecção é feita por substring match (custo zero, sem IA).
 */
export const VILPACK_KNOWLEDGE: CategoryKnowledge[] = [
  {
    name: 'Sacolas',
    triggers: ['sacola', 'sacolinha', 'bag', 'bolsa', 'kraft'],
    summary:
      'Sacolas de papel kraft com alça torcida ou fita, disponíveis em vários tamanhos. Alta resistência para objetos com até 5 kg. Acabamento natural ou personalizado.',
    applications:
      'Lojas de roupas, calçados, presentes, delivery de alimentos, farmácias, papelarias.',
    salesNote:
      'Perguntar: tamanho aproximado do produto que vai dentro, quantidade mensal, se precisa de impressão ou kraft natural.',
  },
  {
    name: 'Sacos de Pão',
    triggers: ['saco de pao', 'saco pao', 'saquinho de pao', 'embalagem pao', 'padaria', 'saco kraft pao', 'paes'],
    summary:
      'Sacos de papel kraft para pão, em diferentes capacidades (1 kg, 3 kg, francês, baguete). Higiênicos, resistentes à umidade e aprovados para contato com alimentos.',
    applications:
      'Padarias, confeitarias, cafeterias, supermercados, restaurantes.',
    salesNote:
      'Perguntar: tamanho do pão (francês, forma, integral, baguete), volume diário, se já usa papel ou plástico.',
  },
  {
    name: 'Sacos SOS',
    triggers: ['sos', 'saco sos', 'saco fundo quadrado', 'saco sanfonado', 'saco de papel', 'take away'],
    summary:
      'Sacos de papel com fundo quadrado (modelo SOS), ideais para alimentos prontos e take-away. Suportam gordura e umidade. Disponíveis em kraft natural ou branco.',
    applications:
      'Food service, lanchonetes, hamburguerias, hotdogs, porções fritas, feiras gastronômicas.',
    salesNote:
      'Perguntar: tamanho do produto (pequeno/médio/grande), se vai aberto ou fechado, volume estimado por semana.',
  },
  {
    name: 'Sacos de Lixo',
    triggers: ['saco de lixo', 'lixo', 'lixeira', 'coleta', 'residuo', 'residuos', 'descarte'],
    summary:
      'Sacos de lixo em PEBD, disponíveis em capacidades de 15 L a 200 L. Versões domésticas, industriais e hospitalares. Cores variadas (preto, branco, verde, azul).',
    applications:
      'Condomínios, hospitais, indústrias, supermercados, restaurantes, limpeza urbana.',
    salesNote:
      'Perguntar: capacidade (volume da lixeira), tipo de resíduo, se precisa de norma hospitalar, quantidade por mês.',
  },
  {
    name: 'Bobinas',
    triggers: ['bobina', 'rolo', 'picotada', 'fundo estrela', 'saco rolo', 'sacola rolo'],
    summary:
      'Bobinas plásticas para uso em fruteiras, hortifruti e supermercados. Modelos picotados e fundo estrela. Plástico resistente, transparente ou colorido.',
    applications:
      'Supermercados, sacolões, hortifruti, açougues, distribuidores de alimentos.',
    salesNote:
      'Perguntar: largura e comprimento do saco, espessura (micras), se é picotado ou rolo contínuo, quantidade.',
  },
  {
    name: 'Papel Acoplado',
    triggers: ['papel acoplado', 'acoplado', 'termico', 'termico acoplado', 'papel para lanche', 'embalagem lanche'],
    summary:
      'Papel acoplado com camada de polietileno para isolamento de gordura e umidade. Disponível em kraft natural, branco, térmico e estampado. Ideal para embalagem de lanches e salgados.',
    applications:
      'Lanchonetes, fast food, hamburguerias, food trucks, padarias, bancas de salgado.',
    salesNote:
      'Perguntar: tamanho do lanche (hambúrguer, X-tudo, wrap), se usa folha ou papel contínuo, se quer personalização.',
  },
  {
    name: 'Filmes PVC',
    triggers: ['filme pvc', 'pvc', 'filme plastico', 'filme esticavel', 'filme para embrulho', 'stretch pvc'],
    summary:
      'Filmes de PVC transparentes, auto-aderentes, para embalagem de alimentos frescos e frios. Alta transparência e vedação. Larguras de 28 cm a 45 cm.',
    applications:
      'Supermercados, açougues, padarias, confeitarias, frios e laticínios.',
    salesNote:
      'Perguntar: largura do rolo, se é para uso manual ou máquina, tipo de produto que vai embalar (carne, frutas, queijo).',
  },
  {
    name: 'Filmes Stretch',
    triggers: ['stretch', 'filme stretch', 'filme strech', 'paletizacao', 'palete', 'amarracao', 'unitizacao'],
    summary:
      'Filmes stretch para paletização e unitização de cargas. Alta elongação e resistência ao rasgo. Disponíveis em bobinas manuais (20–23 cm) e bobinas máquina (50 cm).',
    applications:
      'Indústrias, distribuidores, atacadistas, transportadoras, centros de distribuição.',
    salesNote:
      'Perguntar: peso da carga por pallet, se é uso manual ou com máquina envolvedora, quantos pallets por dia.',
  },
  {
    name: 'Produtos de Limpeza',
    triggers: ['limpeza', 'produto limpeza', 'detergente', 'desinfetante', 'higiene', 'sanitizante', 'multiuso limpeza'],
    summary:
      'Linha de produtos de limpeza para uso institucional e industrial: detergentes, desinfetantes, sanitizantes e multiusos. Formato econômico em galões de 5 L e 20 L.',
    applications:
      'Restaurantes, hospitais, escolas, supermercados, indústrias alimentícias.',
    salesNote:
      'Perguntar: tipo de superfície (chão, equipamentos, banheiro), frequência de uso, volume mensal, se precisa de laudo técnico.',
  },
  {
    name: 'Panos Multiuso',
    triggers: ['pano', 'multiuso', 'pano de limpeza', 'pano descartavel', 'flanela', 'fibra'],
    summary:
      'Panos não tecidos descartáveis e reutilizáveis para limpeza de superfícies. Alta absorção e resistência. Disponíveis em rolos e folhas.',
    applications:
      'Restaurantes, hospitais, cozinhas industriais, limpeza de pisos e equipamentos.',
    salesNote:
      'Perguntar: gramatura desejada, se é descartável ou reutilizável, quantidade por mês.',
  },
];

// ── helpers ────────────────────────────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Detecta quais categorias foram mencionadas no texto.
 * Usa os `triggers` da base de conhecimento estática (custo zero).
 * Retorna lista de CategoryKnowledge das categorias detectadas.
 */
export function detectKnowledgeCategories(text: string): CategoryKnowledge[] {
  const norm = normalizeText(text);
  return VILPACK_KNOWLEDGE.filter((cat) =>
    cat.triggers.some((trigger) => norm.includes(normalizeText(trigger))),
  );
}

/**
 * Detecta categorias também pelo nome canônico (fallback para DB-first approach).
 * Usado para compatibilidade com categorias cadastradas no banco mas não no knowledge.
 */
export function detectByName(text: string, dbCategoryNames: string[]): string[] {
  const norm = normalizeText(text);
  return dbCategoryNames.filter((name) => {
    const nameNorm = normalizeText(name);
    const words = nameNorm.split(/\s+/).filter((w) => w.length >= 3);
    return words.some((w) => norm.includes(w)) || norm.includes(nameNorm);
  });
}

/**
 * CAMADA A: Retorna a lista simples de categorias para o prompt base.
 * Sempre presente. ~40 tokens.
 */
export function buildCategoryList(): string {
  return VILPACK_KNOWLEDGE.map((c) => `  • ${c.name}`).join('\n');
}

/**
 * CAMADA B: Retorna resumo comercial das categorias detectadas.
 * Só entra no prompt quando há menção. ~60-100 tokens por categoria.
 */
export function buildCategoryContext(detected: CategoryKnowledge[]): string {
  if (detected.length === 0) return '';

  const blocks = detected.map(
    (cat) =>
      `[${cat.name.toUpperCase()}]\n` +
      `  Sobre: ${cat.summary}\n` +
      `  Usos: ${cat.applications}\n` +
      `  Orientação: ${cat.salesNote}`,
  );

  return '\n\nCONTEXTO DAS CATEGORIAS MENCIONADAS:\n' + blocks.join('\n\n');
}

/**
 * CAMADA C — flag de intenção de detalhe específico.
 * Retorna true quando o cliente quer detalhe de SKU/tamanho/medida específica.
 * Neste caso, o aiService pode consultar o banco para complementar.
 */
export function isDetailRequest(text: string): boolean {
  const norm = normalizeText(text);
  const detailSignals = [
    'tamanho', 'medida', 'dimensao', 'quanto mede', 'largura', 'comprimento', 'altura',
    'quantos por', 'quantidade por', 'especificacao', 'especifico', 'modelo especifico',
    'opcoes de', 'variacoes', 'qual o tamanho', 'tem de que tamanho',
    'micras', 'espessura', 'gramatura', 'capacidade', 'litros', 'kg', 'quilo',
  ];
  return detailSignals.some((s) => norm.includes(normalizeText(s)));
}
