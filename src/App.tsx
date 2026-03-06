import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Transacoes from "./pages/Transacoes";
import Contas from "./pages/Contas";
import Cartoes from "./pages/Cartoes";
import Pessoas from "./pages/Pessoas";
import Dividas from "./pages/Dividas";
import Metas from "./pages/Metas";
import Empresa from "./pages/Empresa";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import Recorrencias from "./pages/Recorrencias";
import Importar from "./pages/Importar";
import Orcamentos from "./pages/Orcamentos";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Admin from "./pages/Admin";
import EsqueciSenha from "./pages/EsqueciSenha";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Pendentes from "./pages/Pendentes";
import ContaHistorico from "./pages/ContaHistorico";
import Planejamento from "./pages/Planejamento";
import EmpresaContaHistorico from "./pages/EmpresaContaHistorico";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/cadastro" element={<PublicRoute><Cadastro /></PublicRoute>} />
              <Route path="/esqueci-senha" element={<PublicRoute><EsqueciSenha /></PublicRoute>} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes */}
              <Route path="/" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
              <Route path="/transacoes" element={<ProtectedRoute><AppLayout><Transacoes /></AppLayout></ProtectedRoute>} />
              <Route path="/contas" element={<ProtectedRoute><AppLayout><Contas /></AppLayout></ProtectedRoute>} />
              <Route path="/contas/:accountName" element={<ProtectedRoute><AppLayout><ContaHistorico /></AppLayout></ProtectedRoute>} />
              <Route path="/cartoes" element={<ProtectedRoute><AppLayout><Cartoes /></AppLayout></ProtectedRoute>} />
              <Route path="/pessoas" element={<ProtectedRoute><AppLayout><Pessoas /></AppLayout></ProtectedRoute>} />
              <Route path="/dividas" element={<ProtectedRoute><AppLayout><Dividas /></AppLayout></ProtectedRoute>} />
              <Route path="/metas" element={<ProtectedRoute><AppLayout><Metas /></AppLayout></ProtectedRoute>} />
              <Route path="/empresa" element={<ProtectedRoute><AppLayout><Empresa /></AppLayout></ProtectedRoute>} />
              <Route path="/empresa/conta/:accountId" element={<ProtectedRoute><AppLayout><EmpresaContaHistorico /></AppLayout></ProtectedRoute>} />
              <Route path="/recorrencias" element={<ProtectedRoute><AppLayout><Recorrencias /></AppLayout></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><AppLayout><Relatorios /></AppLayout></ProtectedRoute>} />
              <Route path="/importar" element={<ProtectedRoute><AppLayout><Importar /></AppLayout></ProtectedRoute>} />
              <Route path="/orcamentos" element={<ProtectedRoute><AppLayout><Orcamentos /></AppLayout></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><AppLayout><Configuracoes /></AppLayout></ProtectedRoute>} />
              <Route path="/pendentes" element={<ProtectedRoute><AppLayout><Pendentes /></AppLayout></ProtectedRoute>} />
              <Route path="/planejamento" element={<ProtectedRoute><AppLayout><Planejamento /></AppLayout></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AppLayout><Admin /></AppLayout></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
