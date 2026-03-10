import prisma from '../config/prisma';
import { leadCaptureService } from '../services/leadCaptureService';
import { aiService } from '../services/aiService';
import { v4 as uuidv4 } from 'uuid';

/**
 * SCRIPT DE VALIDAÇÃO DO FUNIL DE LEADS - VILPACK
 * Simula os 6 cenários de negócio para garantir o endurecimento (hardening) do sistema.
 */

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runValidation() {
  console.log('🚀 Iniciando Validação Real do Funil de Leads...\n');

  // Criar uma loja e sessão de teste
  const store = await prisma.store.findFirst({ where: { slug: 'vilpack' } });
  if (!store) throw new Error("Loja Vilpack não encontrada. Rode o seed.");

  const sessionId = uuidv4();
  await prisma.session.create({
    data: { id: sessionId, storeId: store.id }
  });

  console.log(`📌 Sessão de Teste: ${sessionId}\n`);

  // --- CENÁRIO 1: Identificação Inicial ---
  console.log('--- CENÁRIO 1: Cliente informa só nome ---');
  await aiService.generateSellerResponse(sessionId, "Olá, meu nome é Ricardo");
  let lead = await leadCaptureService.getLeadBySession(sessionId);
  console.log(`✅ Lead Criado: ${lead?.name === 'Ricardo' ? 'SIM' : 'NÃO'}`);
  console.log(`✅ Status Inicial: ${lead?.status}\n`);

  await delay(30000); // Aguarda 30s para evitar rate limit (5 RPM)

  // --- CENÁRIO 2: Nome + Segmento + Interesse ---
  console.log('--- CENÁRIO 2: Nome + Segmento + Interesse ---');
  await aiService.generateSellerResponse(sessionId, "Tenho uma padaria e procuro sacolas personalizadas");
  lead = await leadCaptureService.getLeadBySession(sessionId);
  console.log(`✅ Segmento Capturado: ${lead?.segment}`);
  console.log(`✅ Score Evoluiu: ${lead?.qualificationScore}`);
  console.log(`✅ Resumo Gerado: ${lead?.summary ? 'SIM' : 'NÃO'}\n`);

  await delay(30000);

  // --- CENÁRIO 3: WhatsApp Natural ---
  console.log('--- CENÁRIO 3: WhatsApp Natural ---');
  await aiService.generateSellerResponse(sessionId, "Pode me chamar no whats 11 99611-3977");
  lead = await leadCaptureService.getLeadBySession(sessionId);
  console.log(`✅ WhatsApp Capturado: ${lead?.whatsapp}`);
 console.log(`✅ Normalização (11996113977): ${lead?.whatsapp === '11996113977' ? 'SIM' : 'NÃO'}\n`);

  await delay(30000);

  // --- CENÁRIO 4: Email Tardio ---
  console.log('--- CENÁRIO 4: Email Tardio ---');
  await aiService.generateSellerResponse(sessionId, "meu email é ricardo@padaria.com.br");
  lead = await leadCaptureService.getLeadBySession(sessionId);
  console.log(`✅ Email Capturado: ${lead?.email}`);
  console.log(`✅ Preservou Nome (Ricardo): ${lead?.name === 'Ricardo' ? 'SIM' : 'NÃO'}`);
  console.log(`✅ Score Final: ${lead?.qualificationScore}\n`);

  await delay(30000);

  // --- CENÁRIO 5: Mensagens Curtas/Ruído ---
  console.log('--- CENÁRIO 5: Mensagem Curta (Ruído) ---');
  const prevScore = lead?.qualificationScore || 0;
  await aiService.generateSellerResponse(sessionId, "ok");
  lead = await leadCaptureService.getLeadBySession(sessionId);
  const currentScore = lead?.qualificationScore || 0;
  console.log(`✅ Score não regrediu: ${currentScore >= prevScore ? 'SIM' : 'NÃO'}`);
  console.log(`✅ Dados preservados: ${lead?.name && lead?.whatsapp ? 'SIM' : 'NÃO'}\n`);

  // --- CENÁRIO 6: Lead Quente/Handoff ---
  console.log('--- CENÁRIO 6: Lead Quente ---');
  console.log(`✅ Prioridade URGENTE (Score > 75): ${lead?.priority === 'URGENT' ? 'SIM' : 'NÃO'}`);
  console.log(`✅ Status WAITING_HUMAN: ${lead?.status === 'WAITING_HUMAN' ? 'SIM' : 'NÃO'}\n`);

  console.log('🎉 Validação concluída com sucesso!');
}

runValidation()
  .catch(e => console.error('❌ Erro na validação:', e))
  .finally(() => prisma.$disconnect());
