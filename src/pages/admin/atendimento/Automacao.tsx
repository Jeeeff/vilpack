/**
 * Automacao — placeholder para configuração de regras de automação.
 * Implementação completa na Etapa 6.
 */
import { Bot } from 'lucide-react';

export default function Automacao() {
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h2 className="text-xl font-bold">Automação</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure regras de resposta automática e comportamento do bot.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground">
        <Bot className="h-12 w-12 opacity-30" />
        <p className="text-sm font-medium">Em desenvolvimento</p>
        <p className="text-xs text-center">
          A configuração de automações estará disponível em breve.
        </p>
      </div>
    </div>
  );
}
