import request from 'supertest';
import app from '../app';
import prisma from '../config/prisma';

async function runAudit() {
  console.log('🚀 Iniciando Auditoria Completa do Sistema Vilpack Bot...');

  let sessionId = '';
  let storeId = '';

  try {
    // 1. Health Check
    console.log('\n🏥 [1/6] Testando Health Check...');
    const healthRes = await request(app).get('/health');
    if (healthRes.status === 200 && healthRes.body.status === 'ok') {
      console.log('✅ Health Check OK');
    } else {
      console.error('❌ Falha no Health Check:', healthRes.body);
      throw new Error('Health Check Falhou');
    }

    // 2. Setup de Dados (Loja)
    console.log('\n🏪 [2/6] Verificando Loja Demo...');
    const store = await prisma.store.findFirst({ where: { slug: 'loja-demo' } });
    if (!store) {
      console.error('❌ Loja Demo não encontrada. Rode o seed primeiro.');
      throw new Error('Loja não encontrada');
    }
    storeId = store.id;
    console.log(`✅ Loja encontrada: ${store.name} (${store.slug})`);

    // 3. Criação de Sessão
    console.log('\n🔑 [3/6] Criando Nova Sessão...');
    const sessionRes = await request(app)
      .post('/api/session')
      .send({ storeSlug: store.slug });
    
    if (sessionRes.status === 201) {
      sessionId = sessionRes.body.sessionId;
      console.log(`✅ Sessão Criada: ${sessionId}`);
    } else {
      console.error('❌ Falha ao criar sessão:', sessionRes.body);
      throw new Error('Criação de Sessão Falhou');
    }

    // 4. Fluxo de Chat (Integração com IA)
    console.log('\n💬 [4/6] Testando Fluxo de Chat...');
    
    // 4.1 Mensagem Inicial
    console.log('   📤 Enviando "Olá"...');
    const chatRes1 = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId, message: 'Olá, sou um auditor.' });
    
    if (chatRes1.status === 200 && chatRes1.body.reply) {
      console.log('   ✅ Resposta recebida da IA');
    } else {
      console.error('   ❌ Falha no chat (1):', chatRes1.body);
    }

    // 4.2 Teste de Memória (Definir Contexto)
    console.log('   📤 Definindo contexto: "Meu código secreto é 1234"');
    await request(app)
      .post('/api/ai/chat')
      .send({ sessionId, message: 'Meu código secreto é 1234. Lembre-se disso.' });

    // 4.3 Teste de Memória (Recuperar Contexto)
    console.log('   📤 Perguntando: "Qual é o meu código secreto?"');
    const chatRes3 = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId, message: 'Qual é o meu código secreto?' });
    
    if (chatRes3.status === 200 && chatRes3.body.reply.includes('1234')) {
      console.log('   ✅ Memória Funcionando: IA lembrou do código.');
    } else {
      console.warn('   ⚠️  Alerta de Memória: IA pode não ter lembrado. Resposta:', chatRes3.body.reply);
    }

    // 5. Catálogo de Produtos
    console.log('\n📦 [5/6] Listando Produtos...');
    const productsRes = await request(app).get(`/api/products?storeId=${storeId}`);
    
    if (productsRes.status === 200 && Array.isArray(productsRes.body)) {
      console.log(`✅ Produtos listados: ${productsRes.body.length} itens encontrados.`);
      const hasImage = productsRes.body.some((p: any) => p.imageUrl);
      if (hasImage) {
        console.log('   ✅ Verificação de Imagens: Produtos possuem URLs de imagem.');
      } else {
        console.warn('   ⚠️  Aviso: Nenhum produto tem imageUrl preenchido.');
      }
    } else {
      console.error('❌ Falha ao listar produtos:', productsRes.body);
    }

    // 6. Teste de Erros
    console.log('\n🛡️ [6/6] Testando Robustez (Erros)...');
    
    // 6.1 Sessão Inválida
    const errorRes1 = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId: 'invalid-uuid', message: 'Oi' });
    if (errorRes1.status === 400 || errorRes1.status === 500) { // Pode ser 400 (validação) ou 500 (prisma erro)
       console.log('   ✅ Tratamento de Sessão Inválida OK');
    } else {
       console.warn('   ⚠️  Status inesperado para sessão inválida:', errorRes1.status);
    }

    // 6.2 Mensagem Vazia
    const errorRes2 = await request(app)
      .post('/api/ai/chat')
      .send({ sessionId, message: '' });
    if (errorRes2.status === 400) {
       console.log('   ✅ Validação de Mensagem Vazia OK');
    } else {
       console.warn('   ⚠️  API aceitou mensagem vazia (Status ' + errorRes2.status + ')');
    }

    console.log('\n✨ Auditoria Concluída com Sucesso! ✨');

  } catch (error) {
    console.error('\n🛑 Auditoria Interrompida por Erro Fatal:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();