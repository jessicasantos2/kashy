import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/useProfile";
import { useNavigate } from "react-router-dom";
import kashyLogo from "@/assets/kashy-logo.png";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : "?";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar: hidden on mobile, visible on tablet/desktop */}
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
                <Avatar className="h-9 w-9 border-2 border-primary/30 cursor-pointer" onClick={() => navigate("/configuracoes")}>
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || "Avatar"} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                </Avatar>
              )}
            </div>
          </header>
          <main className={`flex-1 p-4 md:p-6 overflow-auto ${isMobile ? "pb-20" : ""}`}>
            {children}
          </main>
        </div>
      </div>
      {/* Bottom nav: only on mobile */}
      {isMobile && <MobileBottomNav />}
    </SidebarProvider>
  );
}
