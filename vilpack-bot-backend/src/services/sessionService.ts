import prisma from '../config/prisma';

export const sessionService = {
  async createSession(storeSlug: string) {
    let store = await prisma.store.findUnique({
      where: { slug: storeSlug },
    });

    if (!store) {
      console.log(`[SESSION SERVICE] Loja '${storeSlug}' não encontrada. Criando automaticamente...`);
      store = await prisma.store.create({
        data: {
          name: storeSlug.charAt(0).toUpperCase() + storeSlug.slice(1),
          slug: storeSlug,
          phoneNumber: '5511999999999', // Default placeholder
        }
      });
      console.log(`[SESSION SERVICE] Loja '${storeSlug}' criada com sucesso.`);
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
