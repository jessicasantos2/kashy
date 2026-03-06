import { useState, useMemo } from "react";
import { formatCurrency } from "@/data/financialData";
import { useTransactions } from "@/hooks/useTransactions";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, CircleDashed, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const MONTHS_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const Pendentes = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const now = new Date();
  const { transactions, loading, togglePaid } = useTransactions();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const years = useMemo(() => {
    const set = new Set(transactions.map(t => parseInt(t.date.slice(0, 4))));
    set.add(now.getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions]);

  const unpaid = useMemo(() => {
    const monthStr = String(selectedMonth + 1).padStart(2, "0");
    const yearStr = String(selectedYear);
    return transactions
      .filter(t => t.type === "despesa" && !t.paid && t.date.startsWith(yearStr + "-" + monthStr))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, selectedYear, selectedMonth]);

  const total = unpaid.reduce((acc, t) => acc + t.value, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Contas Pendentes</h1>
            <p className="text-sm text-muted-foreground">Despesas ainda não pagas</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-24 bg-secondary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS_LABEL.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-24 bg-secondary/50"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary card */}
      <div className="glass-card rounded-xl p-4 md:p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{unpaid.length} conta{unpaid.length !== 1 ? "s" : ""} pendente{unpaid.length !== 1 ? "s" : ""} em {MONTHS_LABEL[selectedMonth]} {selectedYear}</p>
          <p className="text-xl md:text-2xl font-bold text-destructive">{formatCurrency(total)}</p>
        </div>
        {unpaid.length === 0 && (
          <p className="text-2xl">🎉</p>
        )}
      </div>

      {/* List */}
      {unpaid.length === 0 ? (
        <div className="glass-card rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <p className="text-lg font-semibold">Tudo pago!</p>
          <p className="text-sm text-muted-foreground mt-1">Não há despesas pendentes neste mês.</p>
        </div>
      ) : (
        <div className="glass-card rounded-xl divide-y divide-border overflow-hidden">
          {unpaid.map((tx) => {
            const billDay = parseInt(tx.date.slice(8, 10));
            const today = new Date();
            const currentDay = selectedYear === today.getFullYear() && selectedMonth === today.getMonth() ? today.getDate() : null;
            const isPast = currentDay !== null && billDay < currentDay;
            const isToday = currentDay !== null && billDay === currentDay;

            return (
              <div key={tx.id} className="flex items-center justify-between px-4 md:px-6 py-3.5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => togglePaid(tx.id, true)}
                  >
                    <CircleDashed className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isToday ? "bg-destructive/20 text-destructive" : isPast ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                    {String(billDay).padStart(2, "0")}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date + "T00:00:00").toLocaleDateString("pt-BR")}
                      {tx.category ? ` · ${tx.category}` : ""}
                      {tx.card ? ` · ${tx.card}` : ""}
                      {tx.person ? ` · ${tx.person}` : ""}
                      {isToday ? " · Hoje" : isPast ? " · Vencida" : ""}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-bold text-destructive whitespace-nowrap ml-3">
                  {formatCurrency(tx.value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Pendentes;
