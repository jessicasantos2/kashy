import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Salary {
  id: string;
  year: number;
  amount: number;
  valid_until: string | null;
  account: string | null;
}

const salariesTable = () => supabase.from("salaries" as any);

export function useSalaries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await salariesTable()
      .select("id, year, amount, valid_until, account")
      .eq("user_id", user.id)
      .order("year", { ascending: false });
    setSalaries((data as unknown as Salary[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const upsert = async (year: number, amount: number, validUntil: string | null, account: string | null = null) => {
    if (!user) return;
    const existing = salaries.find(s => s.year === year);
    if (existing) {
      const { error } = await salariesTable().update({ amount, valid_until: validUntil, account }).eq("id", existing.id);
      if (error) { toast({ title: "Erro ao atualizar salário", variant: "destructive" }); return; }
    } else {
      const { error } = await salariesTable().insert({ user_id: user.id, year, amount, valid_until: validUntil, account });
      if (error) { toast({ title: "Erro ao salvar salário", variant: "destructive" }); return; }
    }
    toast({ title: "Salário salvo com sucesso" });
    await fetch();
  };

  const remove = async (id: string) => {
    const { error } = await salariesTable().delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover salário", variant: "destructive" }); return; }
    toast({ title: "Salário removido" });
    await fetch();
  };

  const getSalaryForYear = (year: number): number => {
    const entry = salaries.find(s => s.year === year);
    return entry?.amount ?? 0;
  };

  return { salaries, loading, upsert, remove, getSalaryForYear, refetch: fetch };
}
