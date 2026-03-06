import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  Users,
  HandCoins,
  Target,
  Building2,
  BarChart3,
  Settings,
  RefreshCw,
  Upload,
  LogOut,
  ShieldCheck,
  CalendarRange,
} from "lucide-react";
import kashyLogo from "@/assets/kashy-logo.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useAdmin } from "@/hooks/useAdmin";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
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

const settingsItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { isAdmin } = useAdmin();
  const initials = (profile?.display_name ?? user?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (collapsed) toggleSidebar();
            }}
            title={collapsed ? "Expandir menu" : "Kashy"}
          >
            <img src={kashyLogo} alt="Kashy" className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg shrink-0 object-contain" />
            {!collapsed && (
              <div className="overflow-hidden">
                <h1 className="text-base font-bold tracking-tight truncate">Kashy</h1>
                <p className="text-[10px] text-muted-foreground truncate">Gestão Financeira</p>
              </div>
            )}
          </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => {
                const active = location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url} end={item.url === "/"} className={`hover:bg-sidebar-accent/50 transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-[3px] border-primary" : ""}`} activeClassName="">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? "justify-center" : ""}`}>
          <Avatar className="h-8 w-8 shrink-0 border border-primary/20">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt="Avatar" />}
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{profile?.display_name ?? user?.email}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </div>
        <SidebarMenu>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === "/admin"}>
                <NavLink to="/admin" end className={`hover:bg-sidebar-accent/50 transition-colors ${location.pathname === "/admin" ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-[3px] border-primary" : ""}`} activeClassName="">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>Admin</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          {settingsItems.map((item) => {
            const active = location.pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={active}>
                  <NavLink to={item.url} end className={`hover:bg-sidebar-accent/50 transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-[3px] border-primary" : ""}`} activeClassName="">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="hover:bg-destructive/10 text-destructive cursor-pointer">
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
