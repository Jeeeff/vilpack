import { useEffect, useState } from "react";
import { Outlet, useNavigate, Link, useLocation, Navigate } from "react-router-dom";
import {
  Users,
  MessageSquare,
  Wifi,
  Zap,
  Settings,
  LogOut,
  ChevronRight,
  Bell,
  Package,
} from "lucide-react";

// ── nav structure ──────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  to: string;
  match: string;
  badge?: number; // future: unread count
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: "Principal",
    items: [
      { label: "CRM / Leads", icon: Users,   to: "/admin/leads",   match: "leads"   },
      { label: "Catálogo",    icon: Package,  to: "/admin/catalog", match: "catalog" },
    ],
  },
  {
    group: "Atendimento",
    items: [
      { label: "Inbox WhatsApp", icon: MessageSquare, to: "/admin/atendimento", match: "atendimento" },
      { label: "Conexão",        icon: Wifi,          to: "/admin/conexao",     match: "conexao"     },
      { label: "Automação",      icon: Zap,           to: "/admin/automacao",   match: "automacao"   },
    ],
  },
  {
    group: "Sistema",
    items: [
      { label: "Configurações", icon: Settings, to: "/admin/configuracoes", match: "configuracoes" },
    ],
  },
];

// ── Page title & breadcrumb sub-label map ──────────────────────────────────────

const PAGE_META: Record<string, { title: string; sub: string }> = {
  leads:         { title: "CRM / Leads",       sub: "Pipeline comercial"         },
  catalog:       { title: "Catálogo",           sub: "Produtos do portfólio"      },
  atendimento:   { title: "Inbox WhatsApp",     sub: "Conversas em tempo real"    },
  conexao:       { title: "Conexão WhatsApp",   sub: "Instância Evolution API"    },
  automacao:     { title: "Automação",          sub: "Regras do bot"              },
  configuracoes: { title: "Configurações",      sub: "Preferências do sistema"    },
};

// ── component ──────────────────────────────────────────────────────────────────

const AdminLayout = () => {
  const navigate   = useNavigate();
  const location   = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) navigate("/admin/login");
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  const isActive = (match: string) => location.pathname.includes(match);

  // Resolve active page meta
  const activeMatch = NAV.flatMap((g) => g.items).find((i) => isActive(i.match));
  const meta = activeMatch ? PAGE_META[activeMatch.match] : { title: "Admin", sub: "Vilpack CRM" };

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "hsl(var(--admin-bg))" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="admin-sidebar flex flex-col shrink-0 transition-[width] duration-200"
        style={{ width: collapsed ? "60px" : "216px" }}
      >
        {/* Brand */}
        <div
          className="flex items-center gap-3 px-3 py-[18px] border-b"
          style={{ borderColor: "hsl(var(--admin-sidebar-border))" }}
        >
          <div
            className="flex items-center justify-center shrink-0 rounded-lg font-black select-none"
            style={{
              width: "34px",
              height: "34px",
              minWidth: "34px",
              background: "hsl(var(--admin-yellow))",
              color: "#1C1C1E",
              fontSize: "15px",
            }}
          >
            V
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div
                className="font-bold text-sm leading-tight truncate"
                style={{ color: "hsl(0 0% 92%)" }}
              >
                Vilpack
              </div>
              <div
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: "hsl(0 0% 38%)" }}
              >
                CRM
              </div>
            </div>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto p-1 rounded transition-colors hover:bg-white/10"
            style={{ color: "hsl(0 0% 40%)" }}
            aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
          >
            <ChevronRight
              size={13}
              style={{
                transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
                transition: "transform 200ms",
              }}
            />
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV.map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <div className="sidebar-group-label">{group.group}</div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.match);
                  const Icon   = item.icon;
                  return (
                    <Link
                      key={item.to + item.match}
                      to={item.to}
                      className={`sidebar-item${active ? " active" : ""}`}
                      style={
                        collapsed
                          ? { justifyContent: "center", paddingLeft: "0", paddingRight: "0" }
                          : {}
                      }
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon size={16} className="shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge ? (
                            <span
                              className="text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none"
                              style={{
                                background: "hsl(var(--admin-yellow))",
                                color: "#1C1C1E",
                              }}
                            >
                              {item.badge}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div
          className="px-2 py-3 border-t"
          style={{ borderColor: "hsl(var(--admin-sidebar-border))" }}
        >
          <button
            onClick={handleLogout}
            className="sidebar-item w-full"
            style={
              collapsed
                ? { justifyContent: "center", paddingLeft: "0", paddingRight: "0" }
                : {}
            }
            title={collapsed ? "Sair" : undefined}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Topbar */}
        <header
          className="shrink-0 flex items-center justify-between px-6 bg-white border-b"
          style={{ height: "56px", borderColor: "hsl(var(--admin-border))" }}
        >
          <div className="flex flex-col justify-center min-w-0">
            <span
              className="font-bold tracking-tight leading-snug truncate"
              style={{ fontSize: "0.9375rem", color: "hsl(var(--admin-text-primary))" }}
            >
              {meta.title}
            </span>
            <span
              className="text-[10px] font-semibold uppercase tracking-widest truncate"
              style={{ color: "hsl(var(--admin-text-muted))" }}
            >
              {meta.sub}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[hsl(var(--admin-bg))]"
              style={{ color: "hsl(var(--admin-text-secondary))" }}
              aria-label="Notificações"
            >
              <Bell size={15} />
            </button>

            {/* Avatar */}
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-[11px] select-none shrink-0"
              style={{
                background: "hsl(var(--admin-yellow))",
                color: "#1C1C1E",
              }}
            >
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
