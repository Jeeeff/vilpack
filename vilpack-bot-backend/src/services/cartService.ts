import prisma from '../config/prisma';

export const cartService = {
  async getCart(sessionId: string) {
    // Ensure session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { store: true }
    });

    if (!session) {
      throw new Error('Sessão inválida ou inexistente');
    }

    let cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { 
        items: {
          include: { product: true }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { sessionId },
        include: { items: { include: { product: true } } }
      });
    }
    return cart;
  },

  async addItem(sessionId: string, productId: string, quantity: number) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { store: true }
    });

    if (!session) {
      throw new Error('Sessão inválida');
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    if (!product.active) {
      throw new Error('Produto indisponível');
    }

    if (product.category.storeId !== session.storeId) {
      throw new Error('Produto não pertence à loja desta sessão');
    }

    let cart = await this.getCart(sessionId);

    // Check if item exists
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId }
    });

    if (existingItem) {
      return prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      });
    }

    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity
      }
    });
  },

  async updateItem(sessionId: string, productId: string, quantity: number) {
    const cart = await this.getCart(sessionId);
    
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId }
    });

    if (!existingItem) {
      throw new Error('Item não encontrado no carrinho');
    }

    if (quantity <= 0) {
      return prisma.cartItem.delete({ where: { id: existingItem.id } });
    }

    return prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity }
    });
  },

  async removeItem(itemId: string) {
    // Used for DELETE /api/cart/item/:itemId (if kept)
    // Or if user wants by productId, we use similar logic to updateItem
    // Assuming standard REST delete by ID for now, but user asked for DELETE /api/cart/item
    // If user meant DELETE /api/cart/item with body { sessionId, productId }, that's non-standard but possible.
    // I'll stick to ID based deletion for simplicity unless schema forces otherwise.
    // Actually, user didn't give schema for delete item.
    // User said "4) Criar endpoint: DELETE /api/cart/item (remover item específico)"
    // This could mean DELETE /api/cart/item/:id
    return prisma.cartItem.delete({ where: { id: itemId } });
  },

  async clearCart(sessionId: string) {
    const cart = await prisma.cart.findUnique({ where: { sessionId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
  },

  async reorder(sessionId: string, orderId: string) {
    // 1. Validate session
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { store: true }
    });

    if (!session) {
      throw new Error('Sessão inválida ou inexistente');
    }

    // 2. Fetch the past order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      throw new Error('Pedido original não encontrado');
    }

    // 3. Add items to current cart
    // We use a loop to leverage existing validations in addItem (active product, correct store, etc.)
    // Errors for individual items (e.g. product discontinued) are caught and logged, 
    // allowing the rest of the order to proceed.
    const results: Array<{ productId: string; status: string; reason?: string }> = [];
    if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          try {
            await this.addItem(sessionId, item.productId, item.quantity);
            results.push({ productId: item.productId, status: 'added' });
          } catch (error) {
            console.warn(`Failed to reorder item ${item.productId}:`, error);
            results.push({ productId: item.productId, status: 'failed', reason: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
    }

    // 4. Return updated cart
    return this.getCart(sessionId);
  },

  async getSummary(sessionId: string) {
    const cart = await this.getCart(sessionId);
    const items = cart.items.map(item => ({
      product: item.product.name,
      price: Number(item.product.price),
      quantity: item.quantity,
      subtotal: Number(item.product.price) * item.quantity
    }));
    
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);

    return { items, total };
  }
};
