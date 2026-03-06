import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/data/financialData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const MONTHS_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const COLORS = ["hsl(160 84% 39%)", "hsl(200 80% 50%)", "hsl(38 92% 50%)", "hsl(280 60% 55%)", "hsl(0 72% 51%)", "hsl(160 40% 60%)", "hsl(220 60% 50%)", "hsl(30 80% 55%)"];

const Relatorios = () => {
  const isMobile = useIsMobile();
  const now = new Date();
  const { transactions, loading } = useTransactions();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const years = useMemo(() => {
    const set = new Set(transactions.map(t => parseInt(t.date.slice(0, 4))));
    set.add(now.getFullYear());
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions]);

  const yearTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(String(selectedYear)));
  }, [transactions, selectedYear]);

  const monthlyData = useMemo(() => {
    return MONTHS_LABEL.map((label, i) => {
      const monthStr = String(i + 1).padStart(2, "0");
      const monthTx = yearTransactions.filter(t => t.date.slice(5, 7) === monthStr);
      const receitas = monthTx.filter(t => t.type === "receita").reduce((s, t) => s + t.value, 0);
      const despesas = monthTx.filter(t => t.type === "despesa").reduce((s, t) => s + t.value, 0);
      return { name: label, receitas, despesas };
    });
  }, [yearTransactions]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    yearTransactions.filter(t => t.type === "despesa").forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.value;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [yearTransactions]);

  const totals = useMemo(() => {
    const receitas = yearTransactions.filter(t => t.type === "receita").reduce((s, t) => s + t.value, 0);
    const despesas = yearTransactions.filter(t => t.type === "despesa").reduce((s, t) => s + t.value, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [yearTransactions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Relatórios</h1>
        <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Receitas</p>
          <p className="text-sm font-bold text-emerald-500">{formatCurrency(totals.receitas)}</p>
        </div>
        <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Despesas</p>
          <p className="text-sm font-bold text-red-500">{formatCurrency(totals.despesas)}</p>
        </div>
        <div className="rounded-lg bg-card border border-border/50 p-3 text-center">
          <p className="text-[11px] text-muted-foreground">Saldo</p>
          <p className={`text-sm font-bold ${totals.saldo >= 0 ? "text-emerald-500" : "text-red-500"}`}>{formatCurrency(totals.saldo)}</p>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="rounded-lg bg-card border border-border/50 p-4">
        <h2 className="text-sm font-semibold mb-3">Receitas x Despesas por Mês</h2>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="receitas" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Chart */}
      <div className="rounded-lg bg-card border border-border/50 p-4">
        <h2 className="text-sm font-semibold mb-3">Despesas por Categoria</h2>
        {categoryData.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 flex-1">
              {categoryData.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="font-medium">{formatCurrency(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">Sem dados de despesas.</p>
        )}
      </div>
    </div>
  );
};

export default Relatorios;
