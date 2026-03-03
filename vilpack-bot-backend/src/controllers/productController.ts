import { Request, Response } from 'express';
import { productService } from '../services/productService';

export const productController = {
  async getAll(req: Request, res: Response) {
    try {
      const products = await productService.getAll();
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

    if (!file) {
      return res.status(400).json({ error: 'Nenhuma imagem enviada' });
    }

    try {
      const imageUrl = `/uploads/products/${file.filename}`;
      const product = await productService.update(id, { imageUrl });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar imagem do produto' });
    }
  }
};

export const updateProductImage = productController.updateProductImage;
