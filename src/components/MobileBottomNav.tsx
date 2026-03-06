import {
  LayoutDashboard,
  ArrowLeftRight,
  Plus,
  Target,
  Menu,
  Wallet,
  CreditCard,
  Users,
  HandCoins,
  Building2,
  BarChart3,
  RefreshCw,
  Upload,
  CalendarRange,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MobileQuickAdd } from "@/components/MobileQuickAdd";
import { useBudgets } from "@/hooks/useBudgets";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";


const tabs = [
  { title: "Home", url: "/", icon: LayoutDashboard },
  { title: "Transações", url: "/transacoes", icon: ArrowLeftRight },
];

const tabsAfter = [
  { title: "Orçamentos", url: "/orcamentos", icon: Target, hasBadge: true },
];

const allPages = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Transações", url: "/transacoes", icon: ArrowLeftRight },
  { title: "Contas", url: "/contas", icon: Wallet },
  { title: "Cartões", url: "/cartoes", icon: CreditCard },
  { title: "Pessoas", url: "/pessoas", icon: Users },
  { title: "Dívidas", url: "/dividas", icon: HandCoins },
  { title: "Metas", url: "/metas", icon: Target },
  { title: "Empresa", url: "/empresa", icon: Building2 },
  { title: "Recorrências", url: "/recorrencias", icon: RefreshCw },
  { title: "Orçamentos", url: "/orcamentos", icon: Target },
  { title: "Importar", url: "/importar", icon: Upload },
  { title: "Planejamento", url: "/planejamento", icon: CalendarRange },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

export function MobileBottomNav() {
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { budgets } = useBudgets();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const hasOverBudget = budgets.some((b) => b.percent >= 100);
  const initials = (profile?.display_name ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <>
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t border-border/50 backdrop-blur-xl md:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-[60px]">
          {tabs.map((tab) => (
            <NavLink
              key={tab.url}
              to={tab.url}
              end={tab.url === "/"}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] text-muted-foreground transition-colors"
              activeClassName="text-primary"
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.title}</span>
            </NavLink>
          ))}

          {/* FAB central */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          >
            <Plus className="h-7 w-7" />
          </button>

          {tabsAfter.map((tab) => (
            <NavLink
              key={tab.url}
              to={tab.url}
              className="relative flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] text-muted-foreground transition-colors"
              activeClassName="text-primary"
            >
              <div className="relative">
                <tab.icon className="h-5 w-5" />
                {tab.hasBadge && hasOverBudget && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-card" />
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.title}</span>
            </NavLink>
          ))}

          {/* Menu button instead of Perfil link */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] text-muted-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Navigation Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>

          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Avatar className="h-10 w-10 border border-primary/20">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{profile?.display_name ?? user?.email}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Pages list */}
          <div className="overflow-y-auto px-2 py-2 space-y-0.5">
            {allPages.map((page) => {
              const isActive = location.pathname === page.url;
              return (
                <button
                  key={page.url + page.title}
                  onClick={() => {
                    navigate(page.url);
                    setDrawerOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-[3px] border-primary"
                      : "text-foreground hover:bg-muted/50"
                  }`}
                >
                  <page.icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm">{page.title}</span>
                </button>
              );
            })}
          </div>

          {/* Admin link */}
          {isAdmin && (
            <div className="px-2 pt-1">
              <button
                onClick={() => { navigate("/admin"); setDrawerOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                  location.pathname === "/admin" ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-[3px] border-primary" : "text-foreground hover:bg-muted/50"
                }`}
              >
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span className="text-sm">Admin</span>
              </button>
            </div>
          )}

          {/* Logout */}
          <div className="px-2 py-3 border-t border-border/50">
            <button
              onClick={() => {
                signOut();
                setDrawerOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Sair</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <MobileQuickAdd open={quickAddOpen} onOpenChange={setQuickAddOpen} />
    </>
  );
}
