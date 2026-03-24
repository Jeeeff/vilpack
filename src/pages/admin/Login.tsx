import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_URL } from "@/config/api";
import { Loader2, Lock } from "lucide-react";

const AdminLogin = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if already logged in
    const token = localStorage.getItem("admin_token");
    if (token) navigate("/admin/leads");
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("admin_token", data.token);
        navigate("/admin/leads");
      } else {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Credenciais inválidas.");
      }
    } catch {
      toast.error("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "hsl(var(--admin-bg))" }}
    >
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] shrink-0 px-12 py-14"
        style={{ background: "hsl(var(--admin-sidebar-bg))" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-xl font-black text-base select-none"
            style={{
              width: "40px",
              height: "40px",
              background: "hsl(var(--admin-yellow))",
              color: "#1C1C1E",
            }}
          >
            V
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">Vilpack</div>
            <div
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "hsl(0 0% 40%)" }}
            >
              CRM
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div>
          <h2
            className="font-bold leading-tight mb-4"
            style={{ fontSize: "1.75rem", color: "hsl(0 0% 92%)", letterSpacing: "-0.02em" }}
          >
            Gestão de clientes<br />
            <span style={{ color: "hsl(var(--admin-yellow))" }}>centralizada e eficiente.</span>
          </h2>
          <p style={{ color: "hsl(0 0% 48%)", fontSize: "0.875rem", lineHeight: "1.6" }}>
            Leads, atendimento WhatsApp e catálogo — tudo em um só lugar.
          </p>
        </div>

        {/* Footer */}
        <div
          className="text-xs"
          style={{ color: "hsl(0 0% 30%)" }}
        >
          © {new Date().getFullYear()} Vilpack Embalagens
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div
              className="flex items-center justify-center rounded-xl font-black text-base select-none"
              style={{
                width: "36px",
                height: "36px",
                background: "hsl(var(--admin-yellow))",
                color: "#1C1C1E",
              }}
            >
              V
            </div>
            <span className="font-bold text-lg" style={{ color: "hsl(var(--admin-text-primary))" }}>
              Vilpack CRM
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1
              className="font-bold mb-1"
              style={{ fontSize: "1.5rem", color: "hsl(var(--admin-text-primary))", letterSpacing: "-0.02em" }}
            >
              Entrar
            </h1>
            <p style={{ color: "hsl(var(--admin-text-secondary))", fontSize: "0.875rem" }}>
              Acesse o painel administrativo
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "hsl(var(--admin-text-muted))" }}
              >
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "hsl(var(--admin-text-muted))" }}
              >
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={loading}
                className="h-11"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading || !username || !password
                  ? "hsl(42 97% 53% / 0.6)"
                  : "hsl(var(--admin-yellow))",
                color: "#1C1C1E",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando…
                </>
              ) : (
                <>
                  <Lock size={15} />
                  Entrar no painel
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
