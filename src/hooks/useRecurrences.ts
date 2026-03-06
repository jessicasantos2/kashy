import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Recurrence {
  id: string;
  name: string;
  amount: number;
  category: string;
  target: string;
  day_of_month: number;
  start_date: string | null;
  end_date: string | null;
}

export function useRecurrences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recurrences, setRecurrences] = useState<Recurrence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("recurrences")
      .select("id, name, amount, category, target, day_of_month, start_date, end_date")
      .eq("user_id", user.id)
      .order("day_of_month");
    if (error) { toast({ title: "Erro ao carregar recorrências", variant: "destructive" }); return; }
    setRecurrences(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const add = async (data: Omit<Recurrence, "id">) => {
    if (!user) return;
    const { error } = await supabase.from("recurrences").insert({ ...data, user_id: user.id });
    if (error) { toast({ title: "Erro ao adicionar recorrência", variant: "destructive" }); return; }
    await fetch();
  };

  const update = async (id: string, data: Omit<Recurrence, "id">) => {
    const { error } = await supabase.from("recurrences").update(data).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar recorrência", variant: "destructive" }); return; }
    await fetch();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("recurrences").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover recorrência", variant: "destructive" }); return; }
    await fetch();
  };

  return { recurrences, loading, add, update, remove, refetch: fetch };
}
