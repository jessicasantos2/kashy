import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type PersonTxType = 'pagamento' | 'divida_minha' | 'divida_pessoa';

export interface PersonTransaction {
  id: string;
  person_id: string;
  date: string;
  description: string;
  amount: number;
  paid: boolean;
  type: PersonTxType;
}

export interface Person {
  id: string;
  name: string;
  transactions: PersonTransaction[];
}

export function usePeople() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data: peopleData, error } = await supabase
      .from("people")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name");
    if (error) { toast({ title: "Erro ao carregar pessoas", variant: "destructive" }); return; }

    const { data: txData } = await supabase
      .from("person_transactions")
      .select("id, person_id, date, description, amount, paid, type")
      .eq("user_id", user.id);

    const mapped = (peopleData ?? []).map(p => ({
      ...p,
      transactions: ((txData ?? []).filter(t => t.person_id === p.id) as unknown as PersonTransaction[]),
    }));
    setPeople(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addPerson = async (name: string) => {
    if (!user) return;
    const { error } = await supabase.from("people").insert({ name, user_id: user.id });
    if (error) { toast({ title: "Erro ao adicionar pessoa", variant: "destructive" }); return; }
    await fetch();
  };

  const updatePerson = async (id: string, name: string) => {
    const { error } = await supabase.from("people").update({ name }).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar pessoa", variant: "destructive" }); return; }
    await fetch();
  };

  const removePerson = async (id: string) => {
    await supabase.from("person_transactions").delete().eq("person_id", id);
    const { error } = await supabase.from("people").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover pessoa", variant: "destructive" }); return; }
    await fetch();
  };

  const addTransaction = async (personId: string, data: { date: string; description: string; amount: number; type: PersonTxType }) => {
    if (!user) return;
    const { error } = await supabase.from("person_transactions").insert({ ...data, person_id: personId, user_id: user.id } as any);
    if (error) { toast({ title: "Erro ao adicionar transação", variant: "destructive" }); return; }
    await fetch();
  };

  const removeTransaction = async (id: string) => {
    const { error } = await supabase.from("person_transactions").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover transação", variant: "destructive" }); return; }
    await fetch();
  };

  const togglePaid = async (id: string, paid: boolean) => {
    const { error } = await supabase.from("person_transactions").update({ paid }).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar status", variant: "destructive" }); return; }
    await fetch();
  };

  return { people, loading, addPerson, updatePerson, removePerson, addTransaction, removeTransaction, togglePaid, refetch: fetch };
}
