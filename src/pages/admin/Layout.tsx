import { useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-primary">Vilpack Admin</h1>
        </div>
        <nav className="p-4 space-y-2">
          <Link to="/admin/leads">
            <Button
              variant={location.pathname.includes("leads") ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Leads & Pedidos
            </Button>
          </Link>
          <Link to="/admin/catalog">
            <Button
              variant={location.pathname.includes("catalog") ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Catálogo de Produtos
            </Button>
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t bg-white">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
