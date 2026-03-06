import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatLocalDate, getMinDisplayYear } from "@/lib/utils";
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export interface MonthlyTotal {
  month: string;
  total: number;
}

export interface NameTotal {
  name: string;
  total: number;
}

export interface DashTransaction {
  id: string;
  date: string;
  description: string;
  category: string;
  account: string | null;
  card: string | null;
  person: string | null;
  value: number;
  type: string;
  installment_number: number | null;
  total_installments: number | null;
  paid: boolean;
}

function getMonth(dateStr: string): number {
  return parseInt(dateStr.split("-")[1]) - 1;
}

export function useDashboardData(year: number, selectedMonth?: number) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<DashTransaction[]>([]);
  const [salary, setSalary] = useState(0);
  const [recurrences, setRecurrences] = useState<{ name: string; amount: number; day_of_month: number; category: string }[]>([]);
  const [totalDebts, setTotalDebts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const now = new Date();
    const referenceMonth = selectedMonth ?? (
      year === now.getFullYear() ? now.getMonth() : (year < now.getFullYear() ? 11 : 0)
    );
    const salaryReferenceDate = formatLocalDate(new Date(year, referenceMonth + 1, 0));

    const [txRes, salaryRes, profileRes, recRes, debtsRes, yearsMinRes, yearsMaxRes] = await Promise.all([
      supabase.from("transactions")
        .select("id, date, description, category, account, card, person, value, type, installment_number, total_installments, paid")
        .eq("user_id", user.id)
        .gte("date", startDate).lte("date", endDate)
        .order("date", { ascending: false }).limit(5000),
      supabase.from("salaries" as any)
        .select("amount, valid_until")
        .eq("user_id", user.id)
        .eq("year", year)
        .order("updated_at", { ascending: false }) as any,
      supabase.from("profiles").select("salary").eq("user_id", user.id).single(),
      supabase.from("recurrences").select("name, amount, day_of_month, category").eq("user_id", user.id),
      supabase.from("debts").select("total_amount, date").eq("user_id", user.id),
      supabase.from("transactions").select("date").eq("user_id", user.id).order("date", { ascending: true }).limit(1),
      supabase.from("transactions").select("date").eq("user_id", user.id).order("date", { ascending: false }).limit(1),
    ]);

    setTransactions(txRes.data ?? []);

    const salaryData = (salaryRes.data ?? []) as { amount: number; valid_until: string | null }[];
    const salaryEntry = salaryData.find((entry) => !entry.valid_until || entry.valid_until >= salaryReferenceDate);
    setSalary(salaryEntry?.amount ?? profileRes.data?.salary ?? 0);
    setRecurrences(recRes.data ?? []);
    const filteredDebts = (debtsRes.data ?? []).filter((d: any) => {
      if (!d.date) return true;
      const debtYear = parseInt(d.date.split("-")[0]);
      return debtYear <= year;
    });
    setTotalDebts(filteredDebts.reduce((acc: number, d: any) => acc + (d.total_amount ?? 0), 0));

    const currentYear = new Date().getFullYear();
    const minDisplayYear = getMinDisplayYear();
    const minYear = yearsMinRes.data?.[0] ? new Date(yearsMinRes.data[0].date).getFullYear() : currentYear;
    const maxYear = yearsMaxRes.data?.[0] ? new Date(yearsMaxRes.data[0].date).getFullYear() : currentYear;
    const years = new Set<number>();
    for (let y = Math.max(Math.min(minYear, currentYear - 1), minDisplayYear); y <= Math.max(maxYear, currentYear); y++) {
      years.add(y);
    }
    setAvailableYears(Array.from(years).sort((a, b) => b - a));
    setLoading(false);
  }, [user, year, selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const expenses = useMemo(() => transactions.filter(t => t.type === "despesa"), [transactions]);
  const paidExpenses = useMemo(() => expenses.filter(t => t.paid), [expenses]);
  const monthlyTotals = useMemo((): MonthlyTotal[] => {
    return MONTHS.map((month, i) => {
      const total = expenses
        .filter(tx => getMonth(tx.date) === i)
        .reduce((acc, t) => acc + t.value, 0);
      return { month, total };
    });
  }, [expenses]);

  const categoryTotals = useMemo((): NameTotal[] => {
    const map: Record<string, number> = {};
    expenses.forEach(tx => { map[tx.category] = (map[tx.category] ?? 0) + tx.value; });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const cardTotals = useMemo((): NameTotal[] => {
    const map: Record<string, number> = {};
    expenses.filter(t => t.card).forEach(tx => { map[tx.card!] = (map[tx.card!] ?? 0) + tx.value; });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const personTotals = useMemo((): NameTotal[] => {
    const map: Record<string, number> = {};
    expenses.filter(t => t.person).forEach(tx => { map[tx.person!] = (map[tx.person!] ?? 0) + tx.value; });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const incomes = useMemo(() => transactions.filter(t => t.type === "receita"), [transactions]);

  const monthlyIncomeTotals = useMemo((): MonthlyTotal[] => {
    return MONTHS.map((month, i) => {
      const total = incomes
        .filter(tx => getMonth(tx.date) === i)
        .reduce((acc, t) => acc + t.value, 0);
      return { month, total };
    });
  }, [incomes]);

  const totalExpenses = useMemo(() => expenses.reduce((acc, t) => acc + t.value, 0), [expenses]);
  const totalPaidExpenses = useMemo(() => paidExpenses.reduce((acc, t) => acc + t.value, 0), [paidExpenses]);

  const currentMonthPaidExpenses = useMemo(() => {
    const idx = selectedMonth !== undefined ? selectedMonth : (year === new Date().getFullYear() ? new Date().getMonth() : (year < new Date().getFullYear() ? 11 : 0));
    return paidExpenses
      .filter(tx => getMonth(tx.date) === idx)
      .reduce((acc, t) => acc + t.value, 0);
  }, [paidExpenses, year, selectedMonth]);

  const now = new Date();
  const currentMonthIdx = selectedMonth !== undefined ? selectedMonth : (year === now.getFullYear() ? now.getMonth() : (year < now.getFullYear() ? 11 : 0));
  const currentMonthExpenses = monthlyTotals[currentMonthIdx]?.total ?? 0;
  const currentMonthIncome = monthlyIncomeTotals[currentMonthIdx]?.total ?? 0;

  const prevMonthIdx = currentMonthIdx > 0 ? currentMonthIdx - 1 : null;
  const prevMonthExpenses = prevMonthIdx !== null ? (monthlyTotals[prevMonthIdx]?.total ?? 0) : null;
  const prevMonthIncome = prevMonthIdx !== null ? (monthlyIncomeTotals[prevMonthIdx]?.total ?? 0) : null;

  const expenseVariation = prevMonthExpenses && prevMonthExpenses > 0
    ? ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100
    : null;

  const incomeVariation = prevMonthIncome && prevMonthIncome > 0
    ? ((currentMonthIncome - prevMonthIncome) / prevMonthIncome) * 100
    : null;

  const currentMonthCardBreakdown = useMemo((): NameTotal[] => {
    const map: Record<string, number> = {};
    expenses
      .filter(t => t.card && getMonth(t.date) === currentMonthIdx)
      .forEach(tx => { map[tx.card!] = (map[tx.card!] ?? 0) + tx.value; });
    return Object.entries(map).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
  }, [expenses, currentMonthIdx]);

  const currentMonthCardTotal = currentMonthCardBreakdown.reduce((acc, c) => acc + c.total, 0);

  const realMonthCount = year === now.getFullYear() ? now.getMonth() + 1 : (year < now.getFullYear() ? 12 : 0);

  const totalSaved = useMemo(() => {
    return monthlyTotals
      .slice(0, realMonthCount)
      .reduce((acc, m) => acc + Math.max(0, salary - m.total), 0);
  }, [monthlyTotals, salary, realMonthCount]);

  return {
    loading,
    transactions,
    salary,
    recurrences,
    totalDebts,
    monthlyTotals,
    monthlyIncomeTotals,
    categoryTotals,
    cardTotals,
    personTotals,
    totalExpenses,
    totalPaidExpenses,
    currentMonthExpenses,
    currentMonthPaidExpenses,
    currentMonthIncome,
    currentMonthIdx,
    currentMonthCardTotal,
    currentMonthCardBreakdown,
    totalSaved,
    realMonthCount,
    availableYears,
    expenseVariation,
    incomeVariation,
    refetch: fetchData,
  };
}
