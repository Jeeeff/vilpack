/**
 * Automacao — placeholder para configuração de regras de automação.
 * Implementação completa na Etapa 6.
 */
import { Bot, Zap, GitBranch, Clock } from 'lucide-react';

const COMING_SOON_ITEMS = [
  {
    icon: GitBranch,
    title: 'Regras de roteamento',
    description: 'Direcione conversas automaticamente por palavra-chave ou horário.',
  },
  {
    icon: Zap,
    title: 'Respostas rápidas',
    description: 'Crie templates de resposta para agilizar o atendimento.',
  },
  {
    icon: Clock,
    title: 'Horário de atendimento',
    description: 'Configure mensagens automáticas fora do horário comercial.',
  },
];

export default function Automacao() {
  return (
    <div className="admin-page">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Page header */}
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-[hsl(var(--admin-yellow-soft))] flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5 text-[hsl(42_80%_38%)]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[hsl(var(--admin-text-primary))]">Automação</h2>
            <p className="text-sm text-[hsl(var(--admin-text-secondary))] mt-0.5">
              Configure regras de resposta automática e comportamento do bot.
            </p>
          </div>
        </div>

        {/* Coming soon cards */}
        <div className="grid gap-3">
          {COMING_SOON_ITEMS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="admin-feature-card"
            >
              <div className="admin-feature-card-icon shrink-0">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{title}</p>
                <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-0.5">{description}</p>
              </div>
              <span className="admin-badge-muted shrink-0 mt-0.5">Em breve</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
