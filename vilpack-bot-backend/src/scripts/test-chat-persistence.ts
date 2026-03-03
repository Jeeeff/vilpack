
import { aiService } from '../services/aiService';
import prisma from '../config/prisma';

async function main() {
  try {
    console.log("🛠️  Iniciando teste de persistência de chat...");

    // 1. Criar ou buscar uma sessão
    const store = await prisma.store.findFirst({ where: { slug: 'loja-demo' } });
    if (!store) throw new Error("Loja demo não encontrada. Rode o seed.");

    // Create a new session for clean testing
    const session = await prisma.session.create({
      data: { storeId: store.id }
    });
    console.log(`✅ Sessão criada: ${session.id}`);

    // 2. Enviar primeira mensagem
    console.log("🗣️  Enviando mensagem 1: 'Olá, meu nome é Carlos.'");
    const reply1 = await aiService.generateSellerResponse(session.id, "Olá, meu nome é Carlos.");
    console.log(`🤖 Resposta 1: ${reply1}`);

    // 3. Verificar se mensagem foi salva
    const messages1 = await prisma.message.findMany({ where: { sessionId: session.id } });
    console.log(`💾 Mensagens no banco: ${messages1.length} (Esperado: 2)`);
    if (messages1.length !== 2) throw new Error("Falha na persistência da mensagem 1");

    // 4. Enviar segunda mensagem (Contexto)
    console.log("🗣️  Enviando mensagem 2: 'Qual é o meu nome?'");
    const reply2 = await aiService.generateSellerResponse(session.id, "Qual é o meu nome?");
    console.log(`🤖 Resposta 2: ${reply2}`);

    // 5. Verificar resposta com contexto
    if (reply2.toLowerCase().includes("carlos")) {
      console.log("✅ Sucesso: A IA lembrou do nome!");
    } else {
      console.warn("⚠️  Atenção: A IA não mencionou o nome 'Carlos'. Verifique o prompt/contexto.");
    }

    // 6. Verificar persistência final
    const messages2 = await prisma.message.findMany({ where: { sessionId: session.id } });
    console.log(`💾 Total de mensagens no banco: ${messages2.length} (Esperado: 4)`);

    console.log("🎉 Teste concluído com sucesso!");

  } catch (error) {
    console.error("❌ Erro no teste:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
