const fs = require('fs');
const path = require('path');

// Simple screenshot capture using puppeteer-core (if available) or just document the process
console.log(`
📸 SCREENSHOTS - Manual Instructions
=====================================

O servidor está rodando em: http://localhost:5173

Para capturar as screenshots com os novos ajustes de CTA:

1. Abra seu navegador em: http://localhost:5173

2. Abra DevTools (F12) e vá para: Console > Settings > Emulation

3. SCREENSHOT 1 - SLIDE SACOLAS (1920px):
   - Device: Custom 1920x1080
   - Tire print: slide-sacolas-1920.png
   - Verifique se o botão está:
     ✓ Um pouco mais baixo
     ✓ Um pouco mais para a direita
     ✓ Centrado na frase "SOLICITE UM ORÇAMENTO"

4. Pressione →  para ir para o slide PADARIA

5. SCREENSHOT 2 - SLIDE PADARIA (1920px):
   - Tire print: slide-padaria-1920.png
   - Verifique se o botão está:
     ✓ Um pouco mais baixo
     ✓ Um pouco mais para a esquerda
     ✓ Centrado na frase "ATRAVÉS DO NOSSO WHATSAPP"

6. Para testar em 1280px, 1600px, 2560px: repita o processo com diferentes resoluções

Novos valores aplicados ✓:

SLIDE SACOLAS (1 e 3):
  1280–1599:  left: 82.8%, top: 85.0%
  1600–1919:  left: 83.2%, top: 85.5%
  1920–2559:  left: 83.5%, top: 85.9%
  2560+:      left: 83.8%, top: 86.3%

SLIDE PADARIA (2):
  1280–1599:  left: 78.8%, top: 79.8%
  1600–1919:  left: 79.3%, top: 80.3%
  1920–2559:  left: 79.7%, top: 80.7%
  2560+:      left: 80.0%, top: 81.1%
`);
