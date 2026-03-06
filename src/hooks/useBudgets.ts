import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Budget {
  id: string;
  user_id: string;
  category: string;
  month: string;
  limit_amount: number;
  created_at: string;
}

export interface BudgetWithSpent extends Budget {
  spent: number;
  percent: number;
}

export function useBudgets(month?: string) {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = month ?? new Date().toISOString().slice(0, 7);

  const fetchBudgets = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [budgetRes, txRes] = await Promise.all([
      supabase.from("budgets").select("*").eq("user_id", user.id).eq("month", currentMonth),
      supabase
        .from("transactions")
        .select("category, value")
        .eq("user_id", user.id)
        .eq("type", "despesa")
        .gte("date", `${currentMonth}-01`)
        .lte("date", `${currentMonth}-31`),
    ]);

    const rawBudgets = (budgetRes.data ?? []) as Budget[];
    const txs = txRes.data ?? [];

    const spentMap: Record<string, number> = {};
    txs.forEach((tx) => {
      spentMap[tx.category] = (spentMap[tx.category] ?? 0) + tx.value;
    });

    const enriched: BudgetWithSpent[] = rawBudgets.map((b) => {
      const spent = spentMap[b.category] ?? 0;
      const percent = b.limit_amount > 0 ? (spent / b.limit_amount) * 100 : 0;
      return { ...b, spent, percent };
    });

    setBudgets(enriched.sort((a, b) => b.percent - a.percent));
    setLoading(false);
  }, [user, currentMonth]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const upsert = async (category: string, limit_amount: number) => {
    if (!user) return;
    const { error } = await supabase.from("budgets").upsert(
      { user_id: user.id, category, month: currentMonth, limit_amount },
      { onConflict: "user_id,category,month" }
    );
    if (error) {
      toast.error("Erro ao salvar orçamento");
      console.error(error);
    } else {
      toast.success("Orçamento salvo");
      fetchBudgets();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover orçamento");
    } else {
      toast.success("Orçamento removido");
      fetchBudgets();
    }
  };

  return { budgets, loading, upsert, remove, refetch: fetchBudgets };
}
