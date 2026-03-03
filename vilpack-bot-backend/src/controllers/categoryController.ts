import { Request, Response } from 'express';
import { categoryService } from '../services/categoryService';

export const categoryController = {
  async getAll(req: Request, res: Response) {
    try {
      const categories = await categoryService.getAll();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const category = await categoryService.getById(req.params.id as string);
      if (!category) return res.status(404).json({ error: 'Categoria não encontrada' });
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar categoria' });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao criar categoria' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const category = await categoryService.update(req.params.id as string, req.body);
      res.json(category);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar categoria' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await categoryService.delete(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao deletar categoria' });
    }
  }
};
