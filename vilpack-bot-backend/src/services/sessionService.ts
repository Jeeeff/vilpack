import prisma from '../config/prisma';

export const sessionService = {
  async createSession(storeSlug: string) {
    const store = await prisma.store.findUnique({
      where: { slug: storeSlug },
    });

    if (!store) {
      throw new Error('Loja não encontrada');
    }

    const session = await prisma.session.create({
      data: {
        storeId: store.id,
        cart: {
          create: {}
        }
      },
      include: {
        cart: true,
      }
    });

    return session;
  },

  async getSession(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        store: true,
        cart: {
          include: {
            items: {
              include: { product: true }
            }
          }
        }
      }
    });

    if (!session) {
      throw new Error('Sessão não encontrada');
    }

    return session;
  }
};
