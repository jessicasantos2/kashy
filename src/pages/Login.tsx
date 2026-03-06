import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Download } from "lucide-react";
import kashyLogo from "@/assets/kashy-logo.png";
import { useToast } from "@/hooks/use-toast";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isInstallable, install } = usePWAInstall();

  const handleInstall = async () => {
    const triggered = await install();
    if (!triggered) {
      setShowInstructions(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao entrar",
        description: error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
      });
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-8 sm:p-4">
      <div className="w-full max-w-md space-y-6 sm:space-y-8 animate-fade-up">
        {/* Install PWA Button */}
        {isInstallable && (
          <div className="flex justify-center">
            <Button
              onClick={handleInstall}
              variant="outline"
              className="gap-2 rounded-full px-6 h-11 bg-foreground text-background hover:bg-foreground/90 hover:text-background border-none shadow-lg"
            >
              <Download className="h-4 w-4" />
              Instalar App
            </Button>
          </div>
        )}

        {/* Logo */}
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <img src={kashyLogo} alt="Kashy" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl" />
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Kashy</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Gestão Financeira Pessoal</p>
          </div>
        </div>

        {/* Form */}
        <div className="glass-card rounded-xl p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div className="text-center">
            <h2 className="text-base sm:text-lg font-semibold">Entrar na sua conta</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Digite suas credenciais para acessar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 sm:h-10 text-base sm:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-11 sm:h-10 text-base sm:text-sm pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-8 sm:w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 sm:h-10 text-base sm:text-sm" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
            <Link to="/esqueci-senha" className="text-muted-foreground hover:text-primary hover:underline">
              Esqueceu a senha?
            </Link>
            <span>
              <span className="text-muted-foreground">Não tem conta? </span>
              <Link to="/cadastro" className="text-primary font-medium hover:underline">
                Criar conta
              </Link>
            </span>
          </div>
        </div>
      </div>

      {/* Install Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img src={kashyLogo} alt="Kashy" className="w-8 h-8 rounded-lg" />
              Instalar Kashy
            </DialogTitle>
            <DialogDescription>
              Instale o Kashy na tela inicial do seu celular para acesso rápido.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            {isIOS ? (
              <div className="space-y-3">
                <p className="font-medium text-foreground">No Safari do iPhone:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta)</li>
                  <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong></li>
                  <li>Toque em <strong>"Adicionar"</strong></li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-medium text-foreground">No Chrome do Android:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Toque no menu <strong>⋮</strong> (três pontos) no canto superior</li>
                  <li>Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong></li>
                  <li>Confirme tocando em <strong>"Instalar"</strong></li>
                </ol>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
