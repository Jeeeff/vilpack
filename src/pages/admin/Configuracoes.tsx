/**
 * Configuracoes — tela de configurações gerais do CRM Vilpack.
 * Stub premium com informações reais do sistema.
 * Expansão completa disponível numa próxima fase.
 */
import { Settings, User, Bell, ShieldCheck, Palette, Database, ChevronRight } from 'lucide-react';

const SECTIONS = [
  {
    icon: User,
    title: 'Perfil do administrador',
    description: 'Nome de exibição, e-mail e senha de acesso ao painel.',
    tag: null,
  },
  {
    icon: Bell,
    title: 'Notificações',
    description: 'Alertas de novos leads, mensagens urgentes e atualizações do sistema.',
    tag: 'Em breve',
  },
  {
    icon: Palette,
    title: 'Aparência',
    description: 'Tema do painel, logotipo e identidade visual do CRM.',
    tag: 'Em breve',
  },
  {
    icon: ShieldCheck,
    title: 'Segurança',
    description: 'Autenticação, tokens de API e controle de acesso.',
    tag: 'Em breve',
  },
  {
    icon: Database,
    title: 'Dados e exportação',
    description: 'Exportar leads, histórico do chat e relatórios em CSV.',
    tag: 'Em breve',
  },
];

const INFO_ROWS = [
  { label: 'Versão do painel',    value: '2.0 — CRM Premium' },
  { label: 'Ambiente',            value: 'Produção' },
  { label: 'Bot ativo',           value: 'Vick (llama-3.3-70b-versatile)' },
  { label: 'Módulo WhatsApp',     value: 'Pronto — aguardando ativação' },
];

export default function Configuracoes() {
  return (
    <div className="admin-page">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Page header */}
        <div className="admin-page-header">
          <div className="admin-page-header-icon">
            <Settings className="h-5 w-5" style={{ color: 'hsl(42 80% 38%)' }} />
          </div>
          <div>
            <h2 className="admin-page-header-title">Configurações</h2>
            <p className="admin-page-header-sub">Preferências gerais do CRM Vilpack.</p>
          </div>
        </div>

        {/* Settings sections */}
        <div className="admin-card rounded-2xl overflow-hidden divide-y divide-[hsl(var(--admin-border))]">
          {SECTIONS.map(({ icon: Icon, title, description, tag }) => (
            <div
              key={title}
              className="flex items-center gap-4 px-5 py-4 group transition-colors hover:bg-[hsl(var(--admin-surface-raised))] cursor-default"
            >
              <div className="h-9 w-9 rounded-lg bg-[hsl(var(--admin-bg))] border border-[hsl(var(--admin-border))] flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-[hsl(var(--admin-text-secondary))]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-[hsl(var(--admin-text-primary))]">{title}</p>
                  {tag && (
                    <span className="admin-badge-muted">{tag}</span>
                  )}
                </div>
                <p className="text-xs text-[hsl(var(--admin-text-secondary))] mt-0.5">{description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-[hsl(var(--admin-text-muted))] shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" />
            </div>
          ))}
        </div>

        {/* System info */}
        <div>
          <p className="admin-section-label mb-3 px-1">Informações do sistema</p>
          <div className="admin-card rounded-2xl overflow-hidden divide-y divide-[hsl(var(--admin-border))]">
            {INFO_ROWS.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-5 py-3">
                <span className="text-xs text-[hsl(var(--admin-text-secondary))]">{label}</span>
                <span className="text-xs font-semibold text-[hsl(var(--admin-text-primary))]">{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
