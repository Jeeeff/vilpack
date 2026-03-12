import { Request, Response } from 'express';
import { productService } from '../services/productService';
import prisma from '../config/prisma';

// Parseia CSV em memória — suporta vírgula e ponto-e-vírgula como separador
const parseCsv = (buffer: Buffer): Record<string, string>[] => {
  const text = buffer.toString('utf-8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Detecta separador
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''));

  return lines.slice(1).map((line) => {
    const values = line.split(sep).map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  }).filter((row) => Object.values(row).some((v) => v !== ''));
};

// Normaliza possíveis nomes de coluna para os campos internos
const normalize = (row: Record<string, string>) => ({
  name:        row['nome'] || row['name'] || row['produto'] || '',
  type:        row['tipo'] || row['type'] || row['categoria'] || row['category'] || 'Geral',
  description: row['descricao'] || row['descricão'] || row['description'] || '',
});

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
      const product = await productService.create(req.body);
      res.status(201).json(product);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar produto' });
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

      for (const row of rows) {
        const { name, type, description } = normalize(row);
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

          // Verifica se produto já existe pelo nome (case-insensitive)
          const existing = await prisma.product.findFirst({
            where: { name: { equals: name, mode: 'insensitive' }, categoryId: category.id },
          });

          if (existing) {
            await prisma.product.update({
              where: { id: existing.id },
              data: { description: description || existing.description, categoryId: category.id },
            });
            results.updated++;
          } else {
            await prisma.product.create({
              data: {
                name,
                description: description || null,
                price: 0,          // Preço definido via WhatsApp conforme regra de negócio
                categoryId: category.id,
                active: true,
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
