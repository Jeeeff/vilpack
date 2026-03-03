import prisma from '../config/prisma';

export const productService = {
  async getAll(activeOnly = true) {
    return prisma.product.findMany({
      where: activeOnly ? { active: true } : {},
      include: { category: true }
    });
  },

  async getById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: { category: true }
    });
  },

  async create(data: any) {
    return prisma.product.create({
      data
    });
  },

  async update(id: string, data: any) {
    return prisma.product.update({
      where: { id },
      data
    });
  },

  async delete(id: string) {
    return prisma.product.delete({
      where: { id }
    });
  }
};
