import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface GoalEntry {
  id: string;
  goal_id: string;
  date: string;
  amount: number;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  entries: GoalEntry[];
}

export function useGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data: goalsData, error } = await supabase
      .from("goals")
      .select("id, name, target_amount")
      .eq("user_id", user.id)
      .order("name");
    if (error) { toast({ title: "Erro ao carregar metas", variant: "destructive" }); return; }

    const { data: entriesData } = await supabase
      .from("goal_entries")
      .select("id, goal_id, date, amount")
      .eq("user_id", user.id);

    const mapped = (goalsData ?? []).map(g => ({
      ...g,
      entries: (entriesData ?? []).filter(e => e.goal_id === g.id),
    }));
    setGoals(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addGoal = async (name: string, target_amount: number) => {
    if (!user) return;
    const { error } = await supabase.from("goals").insert({ name, target_amount, user_id: user.id });
    if (error) { toast({ title: "Erro ao adicionar meta", variant: "destructive" }); return; }
    await fetch();
  };

  const updateGoal = async (id: string, name: string, target_amount: number) => {
    const { error } = await supabase.from("goals").update({ name, target_amount }).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar meta", variant: "destructive" }); return; }
    await fetch();
  };

  const removeGoal = async (id: string) => {
    await supabase.from("goal_entries").delete().eq("goal_id", id);
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover meta", variant: "destructive" }); return; }
    await fetch();
  };

  const addEntry = async (goalId: string, data: { date: string; amount: number }) => {
    if (!user) return;
    const { error } = await supabase.from("goal_entries").insert({ ...data, goal_id: goalId, user_id: user.id });
    if (error) { toast({ title: "Erro ao adicionar aporte", variant: "destructive" }); return; }
    await fetch();
  };

  const removeEntry = async (id: string) => {
    const { error } = await supabase.from("goal_entries").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover aporte", variant: "destructive" }); return; }
    await fetch();
  };

  return { goals, loading, addGoal, updateGoal, removeGoal, addEntry, removeEntry, refetch: fetch };
}
