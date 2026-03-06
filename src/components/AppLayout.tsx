import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Moon, Sun, Settings, ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate, useLocation } from "react-router-dom";
import kashyLogo from "@/assets/kashy-logo.png";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const { profile } = useProfile();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : "?";

  const avatarMenuItems = [
    { title: "Configurações", url: "/configuracoes", icon: Settings },
    ...(isAdmin ? [{ title: "Administrador", url: "/admin", icon: ShieldCheck }] : []),
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {!isMobile && <AppSidebar />}
        <div className="flex-1 flex flex-col min-w-0">
          <header className={`${isMobile ? 'h-[60px]' : 'h-12'} flex items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50 px-4`}>
            {!isMobile && <SidebarTrigger />}
            {isMobile && (
              <div className="flex items-center gap-3">
                <img src={kashyLogo} alt="Kashy" className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-lg object-contain" />
                <span className="text-base font-bold tracking-tight">Kashy</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {isMobile && (
                <Avatar
                  className="h-9 w-9 border-2 border-primary/30 cursor-pointer"
                  onClick={() => setAvatarSheetOpen((prev) => !prev)}
                >
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || "Avatar"} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
              )}
            </div>
          </header>

          {/* Avatar sidebar sheet — slides from the right */}
          {isMobile && (
            <Sheet open={avatarSheetOpen} onOpenChange={setAvatarSheetOpen}>
              <SheetContent side="right" className="w-72 p-0 flex flex-col">
                {/* User info header */}
                <div className="flex items-center gap-3 px-5 pt-6 pb-4 border-b border-border/50">
                  <Avatar className="h-12 w-12 border-2 border-primary/30">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || "Avatar"} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold truncate">{profile?.display_name ?? user?.email}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Menu items */}
                <div className="flex-1 px-3 py-3 space-y-1">
                  {avatarMenuItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <button
                        key={item.url}
                        onClick={() => {
                          navigate(item.url);
                          setAvatarSheetOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted/50"
                        }`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="text-sm">{item.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Logout */}
                <div className="px-3 py-4 border-t border-border/50">
                  <button
                    onClick={() => {
                      signOut();
                      setAvatarSheetOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-medium">Sair</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          )}

          <main className={`flex-1 p-4 md:p-6 overflow-auto ${isMobile ? "pb-20" : ""}`}>
            {children}
          </main>
        </div>
      </div>
      {isMobile && <MobileBottomNav />}
    </SidebarProvider>
  );
}
