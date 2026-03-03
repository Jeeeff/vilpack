export const whatsappService = {
  generateLink(phone: string, customerName: string, items: any[], total: number) {
    const summaryText = items.map(i => `- ${i.quantity}x ${i.product} (R$ ${i.subtotal.toFixed(2)})`).join('\n');
    const message = `Olá, meu nome é ${customerName}.\n\nGostaria de finalizar o seguinte pedido:\n\n${summaryText}\n\n*Total: R$ ${total.toFixed(2)}*`;
    
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
};
