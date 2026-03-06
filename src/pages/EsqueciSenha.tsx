import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail } from "lucide-react";
import kashyLogo from "@/assets/kashy-logo.png";
import { useToast } from "@/hooks/use-toast";

const EsqueciSenha = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4 py-8 sm:p-4">
      <div className="w-full max-w-md space-y-6 sm:space-y-8 animate-fade-up">
        <div className="flex flex-col items-center gap-2 sm:gap-3">
          <img src={kashyLogo} alt="Kashy" className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl" />
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Kashy</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Recuperação de Senha</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 sm:p-6 space-y-5 sm:space-y-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold">E-mail enviado!</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Enviamos um link de redefinição para <strong>{email}</strong>. Verifique sua caixa de entrada e spam.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full mt-2 h-11 sm:h-10 text-base sm:text-sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-base sm:text-lg font-semibold">Esqueceu sua senha?</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Digite seu e-mail e enviaremos um link para redefinir sua senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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

                <Button type="submit" className="w-full h-11 sm:h-10 text-base sm:text-sm" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar link de redefinição"}
                </Button>
              </form>

              <div className="text-center text-sm">
                <Link to="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="h-3 w-3" />
                  Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EsqueciSenha;
