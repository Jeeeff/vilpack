
async function runTest() {
  console.log('🚀 Iniciando testes de integração...');
  const baseUrl = 'http://localhost:3001/api';

  try {
    // 1. Criar Sessão
    console.log('\n📝 1. Criando sessão...');
    const sessionRes = await fetch(`${baseUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeSlug: 'loja-demo'
      })
    });
    
    if (!sessionRes.ok) {
        const err = await sessionRes.text();
        throw new Error(`Falha ao criar sessão: ${sessionRes.status} ${err}`);
    }

    const sessionData = await sessionRes.json();
    console.log('✅ Sessão criada:', sessionData);
    const sessionId = sessionData.sessionId || sessionData.id; 
    // Need to check response structure. Usually { sessionId: "..." } or { id: "..." }

    if (!sessionId) {
        throw new Error('ID da sessão não retornado');
    }

    // 2. Chat com IA
    console.log('\n🤖 2. Testando Chat IA (Gemini)...');
    const chatRes = await fetch(`${baseUrl}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: sessionId,
            message: "Quais caixas vocês têm?"
        })
    });

    if (!chatRes.ok) {
        const err = await chatRes.text();
        throw new Error(`Falha no chat: ${chatRes.status} ${err}`);
    }

    const chatData = await chatRes.json();
    console.log('✅ Resposta da IA:', chatData);

    console.log('\n🎉 TESTES CONCLUÍDOS COM SUCESSO!');

  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
}

runTest();
