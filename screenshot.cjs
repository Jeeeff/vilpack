console.log(`
📸 SCREENSHOTS - Instruções para Captura Manual
==============================================

✅ O servidor está rodando em: http://localhost:5173

PARA CAPTURAR AS SCREENSHOTS COM OS NOVOS AJUSTES DE CTA:

1️⃣  Abra seu navegador em: http://localhost:5173

2️⃣  Abra DevTools (F12) → Console

3️⃣  SCREENSHOT 1 - SLIDE SACOLAS (1920px):
   - Redimensione a janela: 1920x1080
   - Tire um print da página
   - Nomeie como: slide-sacolas-1920.png
   - Verifique:
     ✓ Botão está um pouco mais BAIXO
     ✓ Botão está um pouco mais para a DIREITA
     ✓ Botão está centrado em "SOLICITE UM ORÇAMENTO"

4️⃣  Pressione SETA DIREITA (→) para ir ao slide PADARIA

5️⃣  SCREENSHOT 2 - SLIDE PADARIA (1920px):
   - Tire um print da página
   - Nomeie como: slide-padaria-1920.png
   - Verifique:
     ✓ Botão está um pouco mais BAIXO
     ✓ Botão está um pouco mais para a ESQUERDA
     ✓ Botão está centrado em "ATRAVÉS DO NOSSO WHATSAPP"

═══════════════════════════════════════════════════════════════

📋 VALORES APLICADOS COM SUCESSO ✅

▸ SLIDE SACOLAS (id: 1 e 3):
  └─ 1280–1599px:  left: 82.8%, top: 85.0%  
  └─ 1600–1919px:  left: 83.2%, top: 85.5%  
  └─ 1920–2559px:  left: 83.5%, top: 85.9%  
  └─ 2560px+:      left: 83.8%, top: 86.3%  

▸ SLIDE PADARIA (id: 2):
  └─ 1280–1599px:  left: 78.8%, top: 79.8%  
  └─ 1600–1919px:  left: 79.3%, top: 80.3%  
  └─ 1920–2559px:  left: 79.7%, top: 80.7%  
  └─ 2560px+:      left: 80.0%, top: 81.1%  

═══════════════════════════════════════════════════════════════

🔧 Mudanças implementadas:
   ✓ HeroCarousel.tsx - Slide 1 (SACOLAS)
   ✓ HeroCarousel.tsx - Slide 2 (PADARIA)  
   ✓ HeroCarousel.tsx - Slide 3 (SACOLAS)
   ✓ Build verificado sem erros
   ✓ Transform mantido: translate(-50%, -50%)

═══════════════════════════════════════════════════════════════

Microajustes aplicados:
  • SACOLAS: descer um pouco + mover para direita
  • PADARIA: descer um pouco + mover para esquerda
