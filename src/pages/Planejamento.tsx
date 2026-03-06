import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, CalendarRange, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTransactions } from "@/hooks/useTransactions";
import { useRecurrences } from "@/hooks/useRecurrences";
import { useSalaries } from "@/hooks/useSalaries";
import { useProfile } from "@/hooks/useProfile";
import { useBudgets } from "@/hooks/useBudgets";
import { useCategories } from "@/hooks/useCategories";
import { CategoryBadge } from "@/components/CategoryBadge";

import { formatCurrency } from "@/data/financialData";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Categories that represent salary income — should not be double-counted
const SALARY_CATEGORIES = ["Salário", "Freelance"];

const Planejamento = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [projectionMonths, setProjectionMonths] = useState(6);

  const { transactions } = useTransactions();
  const { recurrences } = useRecurrences();
  const { salaries } = useSalaries();
  const { profile } = useProfile();
  const { budgets } = useBudgets();
  const { getCategoryMeta } = useCategories();

  // Get salary for a specific year/month, respecting valid_until
  const getSalaryForMonth = (year: number, month: number) => {
    const refDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    // Find salary for this year that is valid for this month
    const yearSalaries = salaries.filter(s => s.year === year);
    const entry = yearSalaries.find(s => !s.valid_until || s.valid_until >= refDate);
    return entry?.amount ?? profile?.salary ?? 0;
  };

  // Helper: get transactions for a specific month
  const getMonthTransactions = (yr: number, mo: number) => {
    return transactions.filter(t => {
      const tYear = parseInt(t.date.slice(0, 4));
      const tMonth = parseInt(t.date.slice(5, 7)) - 1;
      return tYear === yr && tMonth === mo;
    });
  };

  // Historical monthly averages (last 6 months of actual data)
  const historicalAverages = useMemo(() => {
    const monthsBack = 6;
    const categoryMap: Record<string, number[]> = {};
    const totalExpenseMonths: number[] = [];
    const totalExtraIncomeMonths: number[] = [];

    for (let i = 1; i <= monthsBack; i++) {
      const d = new Date(currentYear, currentMonth - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const monthTxs = getMonthTransactions(yr, mo);

      const expenses = monthTxs.filter(t => t.type === "despesa");
      // Extra income = receitas that are NOT salary (to avoid double-counting)
      const extraIncome = monthTxs
        .filter(t => t.type === "receita" && !SALARY_CATEGORIES.includes(t.category))
        .reduce((s, t) => s + t.value, 0);

      totalExpenseMonths.push(expenses.reduce((s, t) => s + t.value, 0));
      totalExtraIncomeMonths.push(extraIncome);

      expenses.forEach(t => {
        if (!categoryMap[t.category]) categoryMap[t.category] = Array(monthsBack).fill(0);
        // Use index for proper averaging
        categoryMap[t.category][i - 1] += t.value;
      });
    }

    const validMonths = totalExpenseMonths.filter((_, i) => totalExpenseMonths[i] > 0 || totalExtraIncomeMonths[i] > 0).length || 1;
    const avgExpense = totalExpenseMonths.reduce((a, b) => a + b, 0) / validMonths;
    const avgExtraIncome = totalExtraIncomeMonths.reduce((a, b) => a + b, 0) / validMonths;

    const categoryAverages = Object.entries(categoryMap).map(([name, values]) => ({
      name,
      average: values.reduce((a, b) => a + b, 0) / validMonths,
      total: values.reduce((a, b) => a + b, 0),
    })).sort((a, b) => b.average - a.average);

    return { avgExpense, avgExtraIncome, categoryAverages };
  }, [transactions, currentYear, currentMonth]);

  // Active recurrences total
  const monthlyRecurrenceTotal = useMemo(() => {
    const todayStr = now.toISOString().slice(0, 10);
    return recurrences
      .filter(r => {
        if (r.end_date && r.end_date < todayStr) return false;
        return true;
      })
      .reduce((s, r) => s + r.amount, 0);
  }, [recurrences]);

  // Get active recurrences for a specific month
  const getRecurrencesForMonth = (yr: number, mo: number) => {
    const monthStart = `${yr}-${String(mo + 1).padStart(2, "0")}-01`;
    const monthEnd = `${yr}-${String(mo + 1).padStart(2, "0")}-28`;
    return recurrences.filter(r => {
      if (r.start_date && r.start_date > monthEnd) return false;
      if (r.end_date && r.end_date < monthStart) return false;
      return true;
    }).reduce((s, r) => s + r.amount, 0);
  };

  // Projection data
  const projectionData = useMemo(() => {
    const data: Array<{
      month: string;
      monthKey: string;
      salary: number;
      extraIncome: number;
      recurrences: number;
      variableExpenses: number;
      totalExpenses: number;
      balance: number;
      cumBalance: number;
      status: "past" | "current" | "projected";
    }> = [];

    const pastMonths = 3;
    let cumBalance = 0;

    for (let i = -pastMonths; i < projectionMonths; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const monthKey = `${yr}-${String(mo + 1).padStart(2, "0")}`;
      const salary = getSalaryForMonth(yr, mo);
      const isCurrentMonth = yr === currentYear && mo === currentMonth;
      const isPast = (yr < currentYear) || (yr === currentYear && mo < currentMonth);

      if (isPast || isCurrentMonth) {
        // Use actual transaction data
        const monthTxs = getMonthTransactions(yr, mo);
        const expenses = monthTxs.filter(t => t.type === "despesa").reduce((s, t) => s + t.value, 0);
        const extraIncome = monthTxs
          .filter(t => t.type === "receita" && !SALARY_CATEGORIES.includes(t.category))
          .reduce((s, t) => s + t.value, 0);
        const recTotal = getRecurrencesForMonth(yr, mo);

        const balance = salary + extraIncome - expenses;
        cumBalance += balance;
        data.push({
          month: `${MONTH_NAMES[mo]}/${String(yr).slice(2)}`,
          monthKey,
          salary,
          extraIncome,
          recurrences: recTotal,
          variableExpenses: Math.max(0, expenses - recTotal),
          totalExpenses: expenses,
          balance,
          cumBalance,
          status: isCurrentMonth ? "current" : "past",
        });
      } else {
        // Projected
        const recTotal = getRecurrencesForMonth(yr, mo);
        const variableExpenses = Math.max(0, historicalAverages.avgExpense - monthlyRecurrenceTotal);
        const totalExpenses = recTotal + variableExpenses;
        const balance = salary + historicalAverages.avgExtraIncome - totalExpenses;
        cumBalance += balance;

        data.push({
          month: `${MONTH_NAMES[mo]}/${String(yr).slice(2)}`,
          monthKey,
          salary,
          extraIncome: historicalAverages.avgExtraIncome,
          recurrences: recTotal,
          variableExpenses,
          totalExpenses,
          balance,
          cumBalance,
          status: "projected",
        });
      }
    }
    return data;
  }, [transactions, recurrences, salaries, projectionMonths, historicalAverages, currentYear, currentMonth]);

  // Budget alerts
  const budgetAlerts = useMemo(() => {
    return historicalAverages.categoryAverages
      .map(cat => {
        const budget = budgets.find(b => b.category === cat.name);
        if (!budget) return null;
        const projectedPct = budget.limit_amount > 0 ? (cat.average / budget.limit_amount) * 100 : 0;
        return {
          category: cat.name,
          average: cat.average,
          limit: budget.limit_amount,
          percent: projectedPct,
          status: projectedPct >= 100 ? "over" : projectedPct >= 80 ? "warning" : "ok",
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.percent ?? 0) - (a?.percent ?? 0));
  }, [historicalAverages, budgets]);

  const futureData = projectionData.filter(d => d.status === "projected");
  const projectedTotalSavings = futureData.reduce((s, d) => s + d.balance, 0);
  const projectedAvgBalance = futureData.length > 0 ? projectedTotalSavings / futureData.length : 0;

  const statusBadge = (status: "past" | "current" | "projected") => {
    if (status === "past") return <Badge variant="outline" className="text-[10px]">Real</Badge>;
    if (status === "current") return <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600">Parcial</Badge>;
    return <Badge variant="secondary" className="text-[10px]">⚠️ Projeção</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planejamento Financeiro</h1>
          <p className="text-muted-foreground text-sm">Projeções baseadas em recorrências, salário e histórico</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Projetar</span>
          <Select value={String(projectionMonths)} onValueChange={v => setProjectionMonths(parseInt(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10"><DollarSign className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Salário Atual</p>
                <p className="text-lg font-bold">{formatCurrency(getSalaryForMonth(currentYear, currentMonth))}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-destructive/10"><TrendingDown className="w-5 h-5 text-destructive" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Recorrências Fixas</p>
                <p className="text-lg font-bold">{formatCurrency(monthlyRecurrenceTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10"><TrendingUp className="w-5 h-5 text-amber-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Gasto Médio/Mês</p>
                <p className="text-lg font-bold">{formatCurrency(historicalAverages.avgExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${projectedAvgBalance >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"}`}>
                <CalendarRange className={`w-5 h-5 ${projectedAvgBalance >= 0 ? "text-emerald-500" : "text-destructive"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Projetado/Mês</p>
                <p className={`text-lg font-bold ${projectedAvgBalance >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                  {formatCurrency(projectedAvgBalance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="w-5 h-5 text-primary" />
            Projeção de Saldo Mensal
            <Tooltip>
              <TooltipTrigger><Info className="w-4 h-4 text-muted-foreground" /></TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Meses anteriores usam dados reais. O mês atual é parcial. Meses futuros são projetados com base no salário, recorrências e média de gastos variáveis (excluindo receitas de salário para evitar dupla contagem).</p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData}>
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="balance" name="Saldo Mensal" stroke="hsl(var(--primary))" fill="url(#balanceGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="cumBalance" name="Saldo Acumulado" stroke="hsl(var(--chart-2))" fill="none" strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="w-5 h-5 text-destructive" />
            Composição das Despesas Projetadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="recurrences" name="Recorrências" stackId="a" fill="hsl(var(--chart-1))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="variableExpenses" name="Gastos Variáveis" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Projections */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Gastos Médios por Categoria</CardTitle>
            <p className="text-xs text-muted-foreground">Baseado nos últimos 6 meses</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {historicalAverages.categoryAverages.slice(0, 10).map(cat => {
              const meta = getCategoryMeta(cat.name);
              const pctOfTotal = historicalAverages.avgExpense > 0 ? (cat.average / historicalAverages.avgExpense) * 100 : 0;
              return (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <CategoryBadge name={cat.name} icon={meta.icon} color={meta.color} />
                    <span className="text-sm font-semibold">{formatCurrency(cat.average)}<span className="text-xs text-muted-foreground font-normal">/mês</span></span>
                  </div>
                  <Progress value={pctOfTotal} className="h-1.5" />
                </div>
              );
            })}
            {historicalAverages.categoryAverages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados históricos suficientes</p>
            )}
          </CardContent>
        </Card>

        {/* Budget Alerts */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Alertas de Orçamento
            </CardTitle>
            <p className="text-xs text-muted-foreground">Projeção vs. limites definidos</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {budgetAlerts.filter(Boolean).map((alert: any) => {
              const meta = getCategoryMeta(alert.category);
              return (
                <div key={alert.category} className="glass-card rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <CategoryBadge name={alert.category} icon={meta.icon} color={meta.color} />
                    <Badge variant={alert.status === "over" ? "destructive" : alert.status === "warning" ? "secondary" : "outline"}>
                      {alert.status === "over" ? "Acima do limite" : alert.status === "warning" ? "Atenção" : "OK"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Média: {formatCurrency(alert.average)}</span>
                    <span>Limite: {formatCurrency(alert.limit)}</span>
                  </div>
                  <Progress
                    value={Math.min(alert.percent, 100)}
                    className={`h-1.5 ${alert.status === "over" ? "[&>div]:bg-destructive" : alert.status === "warning" ? "[&>div]:bg-amber-500" : ""}`}
                  />
                </div>
              );
            })}
            {budgetAlerts.filter(Boolean).length === 0 && (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm text-muted-foreground">Nenhum alerta. Defina orçamentos para acompanhar projeções.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Projection Table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Detalhamento Mensal</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-3 font-semibold">Mês</th>
                <th className="text-right py-2 px-3 font-semibold">Salário</th>
                <th className="text-right py-2 px-3 font-semibold">Extras</th>
                <th className="text-right py-2 px-3 font-semibold">Recorrências</th>
                <th className="text-right py-2 px-3 font-semibold">Variáveis</th>
                <th className="text-right py-2 px-3 font-semibold">Total Despesas</th>
                <th className="text-right py-2 px-3 font-semibold">Saldo</th>
                <th className="text-center py-2 px-3 font-semibold">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {projectionData.map((row, i) => (
                <tr key={i} className={`border-b border-border/30 ${row.status === "projected" ? "bg-muted/20" : row.status === "current" ? "bg-amber-500/5" : ""}`}>
                  <td className="py-2.5 px-3 font-medium">{row.month}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600">{formatCurrency(row.salary)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600">{formatCurrency(row.extraIncome)}</td>
                  <td className="py-2.5 px-3 text-right text-destructive">{formatCurrency(row.recurrences)}</td>
                  <td className="py-2.5 px-3 text-right text-destructive">{formatCurrency(row.variableExpenses)}</td>
                  <td className="py-2.5 px-3 text-right font-medium text-destructive">{formatCurrency(row.totalExpenses)}</td>
                  <td className={`py-2.5 px-3 text-right font-bold ${row.balance >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                    {formatCurrency(row.balance)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {statusBadge(row.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  );
};

export default Planejamento;
