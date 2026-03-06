import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Account {
  id: string;
  name: string;
  balance: number;
  image_url: string | null;
}

export interface AccountWithMonthlyBalance extends Account {
  monthlyBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

export function useAccounts(selectedMonth?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountWithMonthlyBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data: accountData, error } = await supabase
      .from("accounts")
      .select("id, name, balance, image_url")
      .eq("user_id", user.id)
      .order("name");
    if (error) { toast({ title: "Erro ao carregar contas", variant: "destructive" }); return; }

    const rawAccounts = accountData ?? [];

    if (selectedMonth) {
      // Parse YYYY-MM
      const [yearStr, monthStr] = selectedMonth.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const [txRes, salaryRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("account, value, type, paid")
          .eq("user_id", user.id)
          .gte("date", startDate)
          .lte("date", endDate),
        supabase
          .from("salaries" as any)
          .select("amount, valid_until, account")
          .eq("user_id", user.id)
          .eq("year", year) as any,
      ]);

      const transactions = txRes.data ?? [];
      const salaryEntries = (salaryRes.data ?? []) as { amount: number; valid_until: string | null; account: string | null }[];
      // Find valid salary for this month
      const validSalary = salaryEntries.find((s) => !s.valid_until || s.valid_until >= endDate);

      const enriched: AccountWithMonthlyBalance[] = rawAccounts.map((a) => {
        const accountTxs = transactions.filter((t) => t.account === a.name);
        let receitas = accountTxs
          .filter((t) => t.type === "receita")
          .reduce((sum, t) => sum + Number(t.value), 0);
        const despesas = accountTxs
          .filter((t) => t.type === "despesa" && t.paid)
          .reduce((sum, t) => sum + Number(t.value), 0);

        // Add salary as income if this account is linked to the salary
        if (validSalary && validSalary.account === a.name) {
          receitas += validSalary.amount;
        }

        return { ...a, monthlyBalance: receitas - despesas, monthlyIncome: receitas, monthlyExpense: despesas };
      });

      setAccounts(enriched);
    } else {
      setAccounts(rawAccounts.map((a) => ({ ...a, monthlyBalance: a.balance, monthlyIncome: 0, monthlyExpense: 0 })));
    }

    setLoading(false);
  }, [user, selectedMonth]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (name: string, balance: number, image_url: string | null = null) => {
    if (!user) return;
    const { error } = await supabase.from("accounts").insert({ name, balance, image_url, user_id: user.id });
    if (error) { toast({ title: "Erro ao adicionar conta", variant: "destructive" }); return; }
    await fetch();
  };

  const update = async (id: string, name: string, balance: number, image_url: string | null = null) => {
    const { error } = await supabase.from("accounts").update({ name, balance, image_url }).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar conta", variant: "destructive" }); return; }
    await fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover conta", variant: "destructive" }); return; }
    await fetch();
  };

  return { accounts, loading, add, update, remove, refetch: fetch };
}
