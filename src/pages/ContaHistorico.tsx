import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Trash2, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/data/financialData";
import { useTransactions } from "@/hooks/useTransactions";
import { useSalaries } from "@/hooks/useSalaries";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ContaHistorico = () => {
  const { accountName } = useParams<{ accountName: string }>();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(accountName || "");
  const { transactions, loading, remove } = useTransactions();
  const { salaries, loading: salariesLoading } = useSalaries();

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
  const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  // Find valid salary for this account and month
  const validSalary = salaries.find(
    (s) => s.year === selectedYear && s.account === decodedName && (!s.valid_until || s.valid_until >= endDate)
  );
  const salaryAmount = validSalary?.amount ?? 0;

  const accountTxs = transactions
    .filter((t) => t.account === decodedName && t.date.startsWith(monthKey))
    .sort((a, b) => b.date.localeCompare(a.date));

  const paidTxs = accountTxs.filter((t) => t.type === "receita" || t.paid);
  const pendingTxs = accountTxs.filter((t) => t.type === "despesa" && !t.paid);

  const totalIncome = accountTxs.filter((t) => t.type === "receita").reduce((s, t) => s + t.value, 0) + salaryAmount;
  const totalExpense = accountTxs.filter((t) => t.type === "despesa" && t.paid).reduce((s, t) => s + t.value, 0);
  const totalPending = pendingTxs.reduce((s, t) => s + t.value, 0);

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

  if (loading || salariesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const renderTxRow = (tx: typeof accountTxs[0]) => (
    <TableRow key={tx.id} className={tx.type === "despesa" && !tx.paid ? "opacity-60" : ""}>
      <TableCell className="whitespace-nowrap">
        {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
      </TableCell>
      <TableCell>{tx.description}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-xs">{tx.category}</Badge>
      </TableCell>
      <TableCell>
        {tx.type === "receita" ? (
          <Badge variant="default" className="text-xs">Receita</Badge>
        ) : tx.paid ? (
          <Badge variant="destructive" className="text-xs flex items-center gap-1 w-fit">
            <Check className="w-3 h-3" /> Pago
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit text-amber-500 border-amber-500">
            <Clock className="w-3 h-3" /> Pendente
          </Badge>
        )}
      </TableCell>
      <TableCell className={`text-right font-medium ${tx.type === "receita" ? "text-emerald-500" : "text-destructive"}`}>
        {tx.type === "receita" ? "+" : "-"}{formatCurrency(tx.value)}
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(tx.id)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contas")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{decodedName}</h1>
          <p className="text-muted-foreground text-sm">Histórico de transações da conta</p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="text-lg font-bold text-emerald-500">{formatCurrency(totalIncome)}</p>
            {salaryAmount > 0 && (
              <p className="text-[10px] text-muted-foreground">Salário: {formatCurrency(salaryAmount)}</p>
            )}
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <TrendingDown className="w-5 h-5 text-destructive" />
          <div>
            <p className="text-xs text-muted-foreground">Despesas Pagas</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(totalExpense)}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-lg font-bold text-amber-500">{formatCurrency(totalPending)}</p>
          </div>
        </div>
        <div className="glass-card rounded-xl p-4 flex items-center gap-3">
          <div className="w-5 h-5" />
          <div>
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className={`text-lg font-bold ${totalIncome - totalExpense >= 0 ? "text-foreground" : "text-destructive"}`}>
              {formatCurrency(totalIncome - totalExpense)}
            </p>
          </div>
        </div>
      </div>

      {accountTxs.length === 0 && salaryAmount === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center text-center">
          <h3 className="text-lg font-semibold">Nenhuma transação encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1">Nenhuma transação neste mês para esta conta.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Paid / Income transactions */}
          {paidTxs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <Check className="w-4 h-4" /> Receitas e Despesas Pagas
              </h3>
              <div className="glass-card rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaryAmount > 0 && (
                      <TableRow>
                        <TableCell className="whitespace-nowrap">01/{String(selectedMonth).padStart(2, "0")}/{selectedYear}</TableCell>
                        <TableCell>Salário</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">Salário</Badge></TableCell>
                        <TableCell><Badge variant="default" className="text-xs">Receita</Badge></TableCell>
                        <TableCell className="text-right font-medium text-emerald-500">+{formatCurrency(salaryAmount)}</TableCell>
                        <TableCell />
                      </TableRow>
                    )}
                    {paidTxs.map(renderTxRow)}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Pending transactions */}
          {pendingTxs.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-500 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Despesas Pendentes
              </h3>
              <div className="glass-card rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTxs.map(renderTxRow)}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transação será removida e os saldos serão atualizados em todos os locais.
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

export default ContaHistorico;
