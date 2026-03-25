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
      // price é obrigatório no schema — no Catálogo não é definido pelo usuário
      // (preço fica na Vitrine), por isso injetamos 0 como default se omitido.
      const data = { price: 0, ...req.body };
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

      for (const row of rows) {
        const { name, type, description, active } = normalize(row);
        if (!name) { results.errors.push(`Linha ignorada: nome vazio`); continue; }

        try {
          // Busca ou cria categoria pelo nome do tipo
          let category = await prisma.category.findFirst({
            where: { name: { equals: type, mode: 'insensitive' }, storeId: store.id },
          });
          if (!category) {
            category = await prisma.category.create({
              data: { name: type, storeId: store.id },
            });
          }

          // Verifica se produto já existe pelo nome (case-insensitive) em qualquer categoria
          const existing = await prisma.product.findFirst({
            where: { name: { equals: name, mode: 'insensitive' } },
          });

          if (existing) {
            await prisma.product.update({
              where: { id: existing.id },
              data: {
                description: description || existing.description,
                categoryId: category.id,
                active,
              },
            });
            results.updated++;
          } else {
            await prisma.product.create({
              data: {
                name,
                description: description || null,
                price: 0,          // Preço definido via WhatsApp conforme regra de negócio
                categoryId: category.id,
                active,
              },
            });
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
