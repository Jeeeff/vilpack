import { Request, Response } from 'express';
import { productService } from '../services/productService';
import prisma from '../config/prisma';

// Parseia uma linha CSV respeitando campos entre aspas (RFC 4180)
const parseCsvLine = (line: string, sep: string): string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        // aspas duplas dentro de campo entre aspas = escape
        if (line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = false; }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (line.startsWith(sep, i)) {
        fields.push(current.trim());
        current = '';
        i += sep.length - 1;
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
};

// Parseia CSV em memória — suporta vírgula e ponto-e-vírgula, respeita aspas
const parseCsv = (buffer: Buffer): Record<string, string>[] => {
  // Tenta UTF-8, depois latin1 (comum em exports do Windows/Excel)
  let text = buffer.toString('utf-8');
  // Remove BOM se presente
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detecta separador: prefere ; se houver, senão ,
  const sep = lines[0].includes(';') ? ';' : ',';
  const rawHeaders = parseCsvLine(lines[0], sep);
  // Normaliza header: minúsculas, sem acentos básicos, só alfanum e espaço
  const headers = rawHeaders.map((h) =>
    h.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9 ]/g, '')                        // remove especiais exceto espaço
      .trim()
  );

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line, sep);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim(); });
    return row;
  }).filter((row) => Object.values(row).some((v) => v !== ''));
};

// Normaliza possíveis nomes de coluna para os campos internos
// Suporta tanto o formato Tiny ERP quanto colunas simples
const normalize = (row: Record<string, string>) => {
  // DEBUG: log das chaves encontradas (remover após validar)
  // console.log('[CSV] headers found:', Object.keys(row));

  // Tenta encontrar o campo nome em várias formas
  const name =
    row['nome do produto 120'] ||  // Tiny ERP
    row['nome do produto']         ||
    row['nome produto']            ||
    row['nome']                    ||
    row['name']                    ||
    row['produto']                 ||
    '';

  // Categoria vem de "Grupo Filtrado" no Tiny ERP
  const type =
    row['grupo filtrado']          ||  // Tiny ERP
    row['grupo']                   ||
    row['categoria']               ||
    row['category']                ||
    row['tipo']                    ||
    row['type']                    ||
    'Geral';

  // Situação: "Ativo/Inativo" no Tiny ERP
  const situacao =
    row['situacao ativosinativo']  ||  // Tiny ERP (após normalize)
    row['situacao']                ||
    row['situação']                ||
    row['ativo']                   ||
    'Ativo';

  const active = situacao.toLowerCase().includes('ativo') && !situacao.toLowerCase().includes('inativo');

  const description =
    row['observacoes']             ||  // Tiny ERP
    row['descricao']               ||
    row['description']             ||
    '';

  return { name, type, description, active };
};

export const productController = {
  async getAll(req: Request, res: Response) {
    try {
      const products = await productService.getAll(false); // retorna ativos e inativos no admin
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const product = await productService.getById(req.params.id as string);
      if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar produto' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { segment, categoryId, ...rest } = req.body;

      // Resolve categoryId a partir do nome do segmento canônico (enviado pelo modal)
      let resolvedCategoryId: string | undefined = categoryId;
      if (segment && !categoryId) {
        // Garante que existe a loja 'vilpack'
        let store = await prisma.store.findUnique({ where: { slug: 'vilpack' } });
        if (!store) {
          store = await prisma.store.create({
            data: { name: 'Vilpack', slug: 'vilpack', phoneNumber: '5511996113977' },
          });
        }
        // Busca ou cria a categoria com o nome do segmento
        let category = await prisma.category.findFirst({
          where: { name: { equals: segment, mode: 'insensitive' }, storeId: store.id },
        });
        if (!category) {
          category = await prisma.category.create({
            data: { name: segment, storeId: store.id },
          });
        }
        resolvedCategoryId = category.id;
      }

      if (!resolvedCategoryId) {
        return res.status(400).json({ error: 'Segmento ou categoryId é obrigatório' });
      }

      // price é obrigatório no schema — preço fica na Vitrine, não no Catálogo
      const data = { price: 0, ...rest, categoryId: resolvedCategoryId };
      const product = await productService.create(data);
      res.status(201).json(product);
    } catch (error: any) {
      console.error('[PRODUCT CREATE ERROR]', error?.message, req.body);
      res.status(500).json({ error: 'Erro ao criar produto', detail: error?.message });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const product = await productService.update(req.params.id as string, req.body);
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await productService.delete(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar produto' });
    }
  },

  async updateProductImage(req: Request, res: Response) {
    const id = req.params.id as string;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    try {
      const imageUrl = `/uploads/products/${file.filename}`;
      const product = await productService.update(id, { imageUrl });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar imagem do produto' });
    }
  },

  // POST /api/admin/products/import-csv
  async importCsv(req: Request, res: Response) {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Nenhum arquivo CSV enviado' });

    try {
      const rows = parseCsv(file.buffer);
      if (rows.length === 0) return res.status(400).json({ error: 'CSV vazio ou sem linhas válidas' });

      // Garante que existe a loja 'vilpack'
      let store = await prisma.store.findUnique({ where: { slug: 'vilpack' } });
      if (!store) {
        store = await prisma.store.create({
          data: { name: 'Vilpack', slug: 'vilpack', phoneNumber: '5511996113977' },
        });
      }

      const results = { created: 0, updated: 0, errors: [] as string[] };

      // Log dos headers detectados para facilitar debug
      if (rows.length > 0) {
        console.log('[CSV] Headers detectados:', Object.keys(rows[0]));
      }

      // ── Pré-carrega categorias e produtos existentes (evita N+1) ─────────────
      // Em vez de 2–4 queries por linha de CSV, faz 2 queries globais e
      // resolve em memória, depois grava cada produto com um único upsert.
      const [existingCategories, existingProducts] = await Promise.all([
        prisma.category.findMany({ where: { storeId: store.id }, select: { id: true, name: true } }),
        prisma.product.findMany({ select: { id: true, name: true, description: true } }),
      ]);

      const categoryMap = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
      const productMap  = new Map(existingProducts.map((p)  => [p.name.toLowerCase(), p]));

      // Cria categorias faltantes em lote (1 query por categoria nova, não por linha)
      const neededCatNames = [...new Set(rows.map((row) => normalize(row).type).filter(Boolean))];
      for (const catName of neededCatNames) {
        if (!categoryMap.has(catName.toLowerCase())) {
          try {
            const created = await prisma.category.create({ data: { name: catName, storeId: store.id } });
            categoryMap.set(catName.toLowerCase(), created);
          } catch {
            const found = await prisma.category.findFirst({
              where: { name: { equals: catName, mode: 'insensitive' }, storeId: store.id },
            });
            if (found) categoryMap.set(catName.toLowerCase(), found);
          }
        }
      }

      // Processa cada linha com os mapas em memória — 1 query por produto
      for (const row of rows) {
        const { name, type, description, active } = normalize(row);
        if (!name) { results.errors.push(`Linha ignorada: nome vazio`); continue; }

        try {
          const category = categoryMap.get(type.toLowerCase());
          if (!category) { results.errors.push(`"${name}": categoria "${type}" não encontrada`); continue; }

          const existingProduct = productMap.get(name.toLowerCase());
          if (existingProduct) {
            await prisma.product.update({
              where: { id: existingProduct.id },
              data: { description: description || existingProduct.description, categoryId: category.id, active },
            });
            results.updated++;
          } else {
            await prisma.product.create({
              data: { name, description: description || null, price: 0, categoryId: category.id, active },
            });
            productMap.set(name.toLowerCase(), { id: 'new', name, description: description || null });
            results.created++;
          }
        } catch (err: any) {
          results.errors.push(`"${name}": ${err.message}`);
        }
      }

      res.json({
        message: `Importação concluída: ${results.created} criados, ${results.updated} atualizados.`,
        ...results,
      });
    } catch (error: any) {
      res.status(500).json({ error: `Erro ao processar CSV: ${error.message}` });
    }
  },
};

export const updateProductImage = productController.updateProductImage;
