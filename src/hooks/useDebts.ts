import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface DebtPayment {
  id: string;
  debt_id: string;
  date: string;
  description: string;
  amount: number;
}

export interface Debt {
  id: string;
  name: string;
  total_amount: number;
  date: string | null;
  payments: DebtPayment[];
}

export function useDebts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data: debtsData, error } = await supabase
      .from("debts")
      .select("id, name, total_amount, date")
      .eq("user_id", user.id)
      .order("name");
    if (error) { toast({ title: "Erro ao carregar dívidas", variant: "destructive" }); return; }

    const { data: paymentsData } = await supabase
      .from("debt_payments")
      .select("id, debt_id, date, description, amount")
      .eq("user_id", user.id);

    const mapped = (debtsData ?? []).map(d => ({
      ...d,
      payments: (paymentsData ?? []).filter(p => p.debt_id === d.id),
    }));
    setDebts(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addDebt = async (name: string, total_amount: number, date?: string) => {
    if (!user) return;
    const { error } = await supabase.from("debts").insert({ name, total_amount, date: date || null, user_id: user.id });
    if (error) { toast({ title: "Erro ao adicionar dívida", variant: "destructive" }); return; }
    await fetch();
  };

  const updateDebt = async (id: string, name: string, total_amount: number, date?: string) => {
    const { error } = await supabase.from("debts").update({ name, total_amount, date: date || null }).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar dívida", variant: "destructive" }); return; }
    await fetch();
  };

  const removeDebt = async (id: string) => {
    await supabase.from("debt_payments").delete().eq("debt_id", id);
    const { error } = await supabase.from("debts").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover dívida", variant: "destructive" }); return; }
    await fetch();
  };

  const addPayment = async (debtId: string, data: { date: string; description: string; amount: number }) => {
    if (!user) return;
    const { error } = await supabase.from("debt_payments").insert({ ...data, debt_id: debtId, user_id: user.id });
    if (error) { toast({ title: "Erro ao adicionar pagamento", variant: "destructive" }); return; }
    await fetch();
  };

  const removePayment = async (id: string) => {
    const { error } = await supabase.from("debt_payments").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover pagamento", variant: "destructive" }); return; }
    await fetch();
  };

  return { debts, loading, addDebt, updateDebt, removeDebt, addPayment, removePayment, refetch: fetch };
}
