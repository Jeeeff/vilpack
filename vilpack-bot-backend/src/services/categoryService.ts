import prisma from '../config/prisma';

export const categoryService = {
  async getAll() {
    return prisma.category.findMany({
      include: { products: true }
    });
  },

  async getById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: { products: true }
    });
  },

  async create(data: any) {
    return prisma.category.create({
      data
    });
  },

  async update(id: string, data: any) {
    return prisma.category.update({
      where: { id },
      data
    });
  },

  async delete(id: string) {
    return prisma.category.delete({
      where: { id }
    });
  }
};
