import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface CardCharge {
  id: string;
  card_id: string;
  date: string;
  description: string;
  installments: string | null;
  value: number;
}

export interface CreditCard {
  id: string;
  name: string;
  card_limit: number;
  closing_day: number;
  due_day: number;
  image_url: string | null;
  charges: CardCharge[];
}

export function useCreditCards() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data: cardsData, error: cardsError } = await supabase
      .from("credit_cards")
      .select("id, name, card_limit, closing_day, due_day, image_url")
      .eq("user_id", user.id)
      .order("name");
    if (cardsError) { toast({ title: "Erro ao carregar cartões", variant: "destructive" }); return; }

    const { data: chargesData } = await supabase
      .from("card_charges")
      .select("id, card_id, date, description, installments, value")
      .eq("user_id", user.id);

    const mapped = (cardsData ?? []).map(c => ({
      ...c,
      charges: (chargesData ?? []).filter(ch => ch.card_id === c.id),
    }));
    setCards(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addCard = async (data: { name: string; card_limit: number; closing_day: number; due_day: number; image_url: string | null }) => {
    if (!user) return;
    const { error } = await supabase.from("credit_cards").insert({ ...data, user_id: user.id });
    if (error) { toast({ title: "Erro ao adicionar cartão", variant: "destructive" }); return; }
    await fetch();
  };

  const updateCard = async (id: string, data: { name: string; card_limit: number; closing_day: number; due_day: number; image_url: string | null }) => {
    const { error } = await supabase.from("credit_cards").update(data).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar cartão", variant: "destructive" }); return; }
    await fetch();
  };

  const removeCard = async (id: string) => {
    await supabase.from("card_charges").delete().eq("card_id", id);
    const { error } = await supabase.from("credit_cards").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover cartão", variant: "destructive" }); return; }
    await fetch();
  };

  const addCharge = async (cardId: string, data: { date: string; description: string; installments: string; value: number }) => {
    if (!user) return;
    const { error } = await supabase.from("card_charges").insert({ ...data, card_id: cardId, user_id: user.id });
    if (error) { toast({ title: "Erro ao adicionar lançamento", variant: "destructive" }); return; }
    await fetch();
  };

  const updateCharge = async (id: string, data: { date: string; description: string; installments: string; value: number }) => {
    const { error } = await supabase.from("card_charges").update(data).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar lançamento", variant: "destructive" }); return; }
    await fetch();
  };

  const removeCharge = async (id: string) => {
    const { error } = await supabase.from("card_charges").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover lançamento", variant: "destructive" }); return; }
    await fetch();
  };

  return { cards, loading, addCard, updateCard, removeCard, addCharge, updateCharge, removeCharge, refetch: fetch };
}
