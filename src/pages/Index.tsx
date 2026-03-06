import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/data/financialData";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ExpenseTable } from "@/components/ExpenseTable";
import { YearComparisonChart } from "@/components/YearComparisonChart";
import { BudgetWidget } from "@/components/BudgetWidget";
import { HealthScoreWidget } from "@/components/HealthScoreWidget";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CreditCard,
  HandCoins,
  CalendarClock,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Progress } from "@/components/ui/progress";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { getMinDisplayYear } from "@/lib/utils";

const PIE_COLORS = [
  "hsl(160 84% 39%)", "hsl(200 80% 50%)", "hsl(38 92% 50%)",
  "hsl(280 60% 55%)", "hsl(0 72% 51%)", "hsl(160 40% 60%)",
  "hsl(220 60% 50%)", "hsl(30 80% 55%)", "hsl(340 60% 50%)", "hsl(180 50% 45%)",
];

interface DashCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning";
  trend?: { value: string; direction: "up" | "down" };
  progress?: number;
  compact?: boolean;
}

function DashCard({ title, value, subtitle, icon, variant = "default", trend, progress, compact }: DashCardProps) {
  const colorMap = {
    default: "bg-primary/10 text-primary",
    success: "bg-primary/10 text-primary",
    danger: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
  };
  const valueColorMap = {
    default: "text-foreground",
    success: "text-primary",
    danger: "text-destructive",
    warning: "text-warning",
  };
  return (
    <div className={`glass-card rounded-xl animate-fade-up ${compact ? "p-2.5" : "p-3 md:p-5"}`}>
      <div className={`flex items-start justify-between ${compact ? "mb-1.5" : "mb-3"}`}>
        <div className={`${compact ? "p-1.5" : "p-2.5"} rounded-lg ${colorMap[variant]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.direction === "up" ? "text-primary" : "text-destructive"}`}>
            {trend.direction === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      <p className={`text-muted-foreground ${compact ? "text-xs mb-0.5" : "text-sm mb-1"}`}>{title}</p>
      <p className={`font-bold tracking-tight ${valueColorMap[variant]} ${compact ? "text-base" : "text-lg md:text-xl"}`}>{value}</p>
      {subtitle && <p className={`text-xs text-muted-foreground ${compact ? "mt-0.5" : "mt-1"}`}>{subtitle}</p>}
      {progress !== undefined && (
        <div className={compact ? "mt-1.5" : "mt-3"}>
          <Progress value={Math.min(100, Math.max(0, progress))} className="h-2" />
        </div>
      )}
    </div>
  );
}

const MONTHS_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const Index = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const {
    loading,
    salary,
    monthlyTotals,
    categoryTotals,
    currentMonthExpenses,
    currentMonthPaidExpenses,
    currentMonthIncome,
    currentMonthIdx,
    currentMonthCardTotal,
    currentMonthCardBreakdown,
    totalDebts,
    totalSaved,
    realMonthCount,
    recurrences,
    transactions,
    availableYears,
    expenseVariation,
    incomeVariation,
  } = useDashboardData(selectedYear, selectedMonth);

  // Auto-generate recurring transactions on first Dashboard load
  const autoGenRef = useRef(false);
  useEffect(() => {
    if (loading || autoGenRef.current) return;
    autoGenRef.current = true;
    supabase.functions.invoke("generate-recurring-transactions", { body: {} }).catch(() => {});
  }, [loading]);

  const isCurrentOrPast = selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth <= now.getMonth());
  const saldoAtual = isCurrentOrPast ? (salary + currentMonthIncome) - currentMonthPaidExpenses : null;
  const guardadoProgress = salary > 0 && realMonthCount > 0 ? (totalSaved / (salary * realMonthCount)) * 100 : 0;

  const categories = categoryTotals.slice(0, 8);

  const allUnpaidBills = useMemo(() => {
    const monthStr = String(selectedMonth + 1).padStart(2, "0");
    return transactions
      .filter(t => t.type === "despesa" && !t.paid && t.date.slice(5, 7) === monthStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, selectedMonth]);

  const unpaidBills = allUnpaidBills.slice(0, 4);
  const unpaidTotal = allUnpaidBills.reduce((acc, t) => acc + t.value, 0);

  const yearsToShow = availableYears.length > 0 ? availableYears : [now.getFullYear()];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-24 bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS_LABEL.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-24 bg-secondary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearsToShow.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile layout */}
      {isMobile ? (
        <div className="space-y-3">
          {/* Line 1: Saldo Atual (full width) */}
          <DashCard
            title={saldoAtual !== null ? "Saldo Atual" : "Saldo Previsto"}
            value={formatCurrency(saldoAtual ?? (salary - (monthlyTotals[0]?.total ?? 0)))}
            subtitle={saldoAtual !== null ? MONTHS_LABEL[currentMonthIdx] : "⚠️ Previsão"}
            icon={<Wallet className="w-5 h-5" />}
            variant={(saldoAtual ?? 0) >= 0 ? "success" : "danger"}
            trend={saldoAtual !== null ? { value: formatCurrency(Math.abs(saldoAtual)), direction: saldoAtual >= 0 ? "up" : "down" } : undefined}
          />
          {/* Line 2: Entradas + Saídas */}
          <div className="grid grid-cols-2 gap-3">
            <DashCard
              title="Entradas do Mês"
              value={formatCurrency(salary + currentMonthIncome)}
              subtitle={incomeVariation !== null ? `${incomeVariation >= 0 ? "+" : ""}${incomeVariation.toFixed(1)}%` : "Salário + receitas"}
              icon={<TrendingUp className="w-5 h-5" />}
              variant="success"
              trend={incomeVariation !== null ? { value: `${Math.abs(incomeVariation).toFixed(1)}%`, direction: incomeVariation >= 0 ? "up" : "down" } : undefined}
              compact
            />
            <DashCard
              title="Saídas do Mês"
              value={formatCurrency(-currentMonthPaidExpenses)}
              subtitle={currentMonthExpenses > currentMonthPaidExpenses ? `Pendente: ${formatCurrency(currentMonthExpenses - currentMonthPaidExpenses)}` : "Tudo pago!"}
              icon={<TrendingDown className="w-5 h-5" />}
              variant="danger"
              trend={expenseVariation !== null
                ? { value: `${Math.abs(expenseVariation).toFixed(1)}%`, direction: expenseVariation > 0 ? "down" : "up" }
                : { value: formatCurrency(currentMonthPaidExpenses), direction: "down" }
              }
              compact
            />
          </div>
          {/* Line 3: Cartões + Dívidas */}
          <div className="grid grid-cols-2 gap-3">
            <DashCard
              title="Total em Cartões"
              value={formatCurrency(currentMonthCardTotal)}
              subtitle="Faturas do mês"
              icon={<CreditCard className="w-5 h-5" />}
              variant="warning"
              compact
            />
            <DashCard
              title="Total em Dívidas"
              value={formatCurrency(totalDebts)}
              subtitle="Saldo devedor"
              icon={<HandCoins className="w-5 h-5" />}
              variant="danger"
              compact
            />
          </div>
          {/* Line 4: Total Guardado (full width) */}
          <DashCard
            title="Total Guardado"
            value={formatCurrency(totalSaved)}
            subtitle={realMonthCount > 0 ? `Saldo positivo real (${realMonthCount} meses)` : "Sem dados reais ainda"}
            icon={<PiggyBank className="w-5 h-5" />}
            variant="success"
            progress={guardadoProgress}
            compact
          />
        </div>
      ) : (
        <>
          {/* Desktop: Row 1 — 3 main cards */}
          <div className="grid grid-cols-3 gap-4">
            <DashCard
              title={saldoAtual !== null ? "Saldo Atual" : "Saldo Previsto"}
              value={formatCurrency(saldoAtual ?? (salary - (monthlyTotals[0]?.total ?? 0)))}
              subtitle={saldoAtual !== null ? MONTHS_LABEL[currentMonthIdx] : "⚠️ Previsão"}
              icon={<Wallet className="w-5 h-5" />}
              variant={(saldoAtual ?? 0) >= 0 ? "success" : "danger"}
              trend={saldoAtual !== null ? { value: formatCurrency(Math.abs(saldoAtual)), direction: saldoAtual >= 0 ? "up" : "down" } : undefined}
            />
            <DashCard
              title="Entradas do Mês"
              value={formatCurrency(salary + currentMonthIncome)}
              subtitle={incomeVariation !== null ? `${incomeVariation >= 0 ? "+" : ""}${incomeVariation.toFixed(1)}% vs mês anterior` : "Salário + receitas"}
              icon={<TrendingUp className="w-5 h-5" />}
              variant="success"
              trend={incomeVariation !== null ? { value: `${Math.abs(incomeVariation).toFixed(1)}%`, direction: incomeVariation >= 0 ? "up" : "down" } : undefined}
            />
            <DashCard
              title="Saídas do Mês"
              value={formatCurrency(-currentMonthPaidExpenses)}
              subtitle={currentMonthExpenses > currentMonthPaidExpenses ? `Pendente: ${formatCurrency(currentMonthExpenses - currentMonthPaidExpenses)}` : "Tudo pago!"}
              icon={<TrendingDown className="w-5 h-5" />}
              variant="danger"
              trend={expenseVariation !== null
                ? { value: `${Math.abs(expenseVariation).toFixed(1)}%`, direction: expenseVariation > 0 ? "down" : "up" }
                : { value: formatCurrency(currentMonthPaidExpenses), direction: "down" }
              }
            />
          </div>
          {/* Desktop: Row 2 — 3 secondary cards */}
          <div className="grid grid-cols-3 gap-4">
            <DashCard
              title="Total em Cartões"
              value={formatCurrency(currentMonthCardTotal)}
              subtitle="Faturas do mês atual"
              icon={<CreditCard className="w-5 h-5" />}
              variant="warning"
            />
            <DashCard
              title="Total em Dívidas"
              value={formatCurrency(totalDebts)}
              subtitle="Saldo devedor acumulado"
              icon={<HandCoins className="w-5 h-5" />}
              variant="danger"
            />
            <DashCard
              title="Total Guardado"
              value={formatCurrency(totalSaved)}
              subtitle={realMonthCount > 0 ? `Saldo positivo real (${realMonthCount} meses)` : "Sem dados reais ainda"}
              icon={<PiggyBank className="w-5 h-5" />}
              variant="success"
              progress={guardadoProgress}
            />
          </div>
        </>
      )}

      {/* Score de Saúde Financeira - mobile only (desktop moved below) */}
      {isMobile && <HealthScoreWidget year={selectedYear} />}

      {/* Row 3 — Chart + Upcoming Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="lg:col-span-3 flex">
          <MonthlyChart data={monthlyTotals} salary={salary} className="flex-1" />
        </div>
        <div className="lg:col-span-2 glass-card rounded-xl p-4 md:p-6 animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <CalendarClock className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base md:text-lg font-semibold">Contas Pendentes</h3>
              <p className="text-sm text-muted-foreground">Despesas não pagas em {MONTHS_LABEL[selectedMonth]}</p>
            </div>
          </div>
          {unpaidBills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Todas as contas do mês estão pagas! 🎉</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                {unpaidBills.map((bill) => {
                  const billDay = parseInt(bill.date.slice(8, 10));
                  const today = new Date();
                  const currentDay = selectedYear === today.getFullYear() && selectedMonth === today.getMonth() ? today.getDate() : null;
                  const isPast = currentDay !== null && billDay < currentDay;
                  const isToday = currentDay !== null && billDay === currentDay;
                  return (
                    <div key={bill.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${isToday ? "bg-destructive/20 text-destructive" : isPast ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                          {String(billDay).padStart(2, "0")}
                        </div>
                        <div>
                          <span className="text-sm font-medium truncate">{bill.description}</span>
                          <p className="text-xs text-muted-foreground">
                            {new Date(bill.date + "T00:00:00").toLocaleDateString("pt-BR")}
                            {bill.category ? ` · ${bill.category}` : ""}
                            {isToday ? " · Hoje" : isPast ? " · Vencida" : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-destructive">
                        {formatCurrency(bill.value)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{allUnpaidBills.length} conta{allUnpaidBills.length !== 1 ? "s" : ""} pendente{allUnpaidBills.length !== 1 ? "s" : ""}</p>
                  <p className="text-sm font-bold text-destructive">{formatCurrency(unpaidTotal)}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/pendentes")}>
                  Ver mais <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 4 — Category chart + Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="lg:col-span-3 glass-card rounded-xl p-4 md:p-6 animate-fade-up">
          <h3 className="text-base md:text-lg font-semibold mb-1">Despesas por Categoria</h3>
          <p className="text-sm text-muted-foreground mb-4 md:mb-6">Distribuição anual de gastos</p>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação registrada.</p>
          ) : (
            <div className="flex flex-col items-center gap-4 md:flex-row md:gap-6 lg:flex-row">
              <div className="w-40 h-40 md:w-48 md:h-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} cx="50%" cy="50%" innerRadius={isMobile ? 35 : 45} outerRadius={isMobile ? 65 : 80} paddingAngle={2} dataKey="total">
                      {categories.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))" }} labelStyle={{ color: "hsl(var(--foreground))" }} itemStyle={{ color: "hsl(var(--foreground))" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 grid grid-cols-1 gap-y-2 w-full min-w-0">
                {categories.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-sm py-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground truncate">{cat.name}</span>
                    </div>
                    <span className="font-medium text-foreground ml-2 flex-shrink-0">{formatCurrency(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 glass-card rounded-xl p-4 md:p-6 animate-fade-up">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base md:text-lg font-semibold">Cartões e Crédito</h3>
              <p className="text-sm text-muted-foreground">Faturas por cartão no mês</p>
            </div>
          </div>
          {currentMonthCardBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum gasto em cartão no mês.</p>
          ) : (
            <div className="divide-y divide-border">
              {currentMonthCardBreakdown.map((card, i) => (
                <div key={i} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">{card.name}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(card.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Score de Saúde Financeira - desktop only */}
      {!isMobile && <HealthScoreWidget year={selectedYear} />}

      {/* Orçamentos do Mês */}
      <BudgetWidget />

      {/* Comparativo Anual */}
      <YearComparisonChart />

      {/* Últimas Transações */}
      <ExpenseTable transactions={transactions.filter(t => {
        const m = parseInt(t.date.split("-")[1]) - 1;
        return m === currentMonthIdx;
      })} salary={salary} />

      <Alert variant="default" className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-xs text-muted-foreground">
          O sistema exibe dados dos últimos 5 anos ({getMinDisplayYear()}–{new Date().getFullYear()}). Parcelamentos, financiamentos e dívidas continuam visíveis independentemente do período.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default Index;
