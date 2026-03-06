import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/data/financialData";
import { useCompanyAccounts } from "@/hooks/useCompanyAccounts";
import { useCompanyEntries } from "@/hooks/useCompanyEntries";
import { supabase } from "@/integrations/supabase/client";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const EmpresaContaHistorico = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useCompanyAccounts();
  const { revenues, expenses, loading: entriesLoading, remove } = useCompanyEntries();

  const account = accounts.find((a) => a.id === accountId);

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;

  const allEntries = useMemo(() => {
    return [...revenues, ...expenses]
      .filter((e) => e.company_account_id === accountId && e.date.startsWith(monthKey))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [revenues, expenses, accountId, monthKey]);

  const monthRevenues = allEntries.filter((e) => e.type === "revenue");
  const monthExpenses = allEntries.filter((e) => e.type === "expense");

  const totalRevenue = monthRevenues.reduce((s, e) => s + e.amount, 0);
  const totalExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const balance = totalRevenue - totalExpense;

  // Use RPC for accurate cumulative balance
  const [cumulativeBalance, setCumulativeBalance] = useState(0);
  useEffect(() => {
    if (!accountId) return;
    const fetch = async () => {
      const { data } = await supabase.rpc("calculate_company_account_balance" as any, {
        p_account_id: accountId,
      });
      setCumulativeBalance(Number(data) || 0);
    };
    fetch();
  }, [accountId, revenues, expenses]);

  const prevMonth = () => {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await remove(deleteId);
    setDeleteId(null);
    setDeleting(false);
  };

  if (accountsLoading || entriesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/empresa")}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Voltar
        </Button>
        <p className="text-muted-foreground">Conta não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/empresa")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Avatar className="h-10 w-10">
          {account.image_url ? <AvatarImage src={account.image_url} alt={account.name} /> : null}
          <AvatarFallback className="text-xs bg-muted">{account.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{account.name}</h1>
          <p className="text-muted-foreground text-sm">
            {account.bank ? `${account.bank} · ` : ""}Histórico de lançamentos
          </p>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="w-5 h-5" /></Button>
        <span className="text-base font-semibold min-w-[180px] text-center">
          {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
        </span>
        <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="w-5 h-5" /></Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <TrendingDown className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <DollarSign className={`w-5 h-5 ${balance >= 0 ? "text-primary" : "text-destructive"}`} />
          <div>
            <p className="text-xs text-muted-foreground">Resultado do Mês</p>
            <p className={`text-lg font-bold ${balance >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(balance)}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <DollarSign className={`w-5 h-5 ${cumulativeBalance >= 0 ? "text-foreground" : "text-destructive"}`} />
          <div>
            <p className="text-xs text-muted-foreground">Saldo Acumulado</p>
            <p className={`text-lg font-bold ${cumulativeBalance >= 0 ? "text-foreground" : "text-destructive"}`}>{formatCurrency(cumulativeBalance)}</p>
          </div>
        </div>
      </div>

      {/* Entries table */}
      {allEntries.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center">
          <h3 className="text-lg font-semibold">Nenhum lançamento</h3>
          <p className="text-sm text-muted-foreground mt-1">Nenhum lançamento vinculado a esta conta neste mês.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {allEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(e.date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{e.category || "Outros"}</Badge>
                  </TableCell>
                  <TableCell>
                    {e.type === "revenue" ? (
                      <Badge variant="default" className="text-xs">Receita</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">Gasto</Badge>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${e.type === "revenue" ? "text-primary" : "text-destructive"}`}>
                    {e.type === "revenue" ? "+" : "-"}{formatCurrency(e.amount)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EmpresaContaHistorico;
