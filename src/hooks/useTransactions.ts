import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { formatLocalDate, todayString } from "@/lib/utils";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  account: string | null;
  card: string | null;
  person: string | null;
  value: number;
  type: string;
  transaction_group_id: string | null;
  installment_number: number | null;
  total_installments: number | null;
  paid: boolean;
}

export type TransactionInsert = Omit<Transaction, "id" | "paid">;

export function useTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, description, category, account, card, person, value, type, transaction_group_id, installment_number, total_installments, paid")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(5000);
    if (error) { toast({ title: "Erro ao carregar transações", variant: "destructive" }); return; }
    setTransactions(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const syncCardCharge = async (cardName: string, date: string, description: string, value: number, installments?: string) => {
    if (!user) return;
    const { data: cardsData } = await supabase
      .from("credit_cards")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", cardName)
      .limit(1);
    if (cardsData && cardsData.length > 0) {
      await supabase.from("card_charges").insert({
        card_id: cardsData[0].id,
        user_id: user.id,
        date,
        description,
        value,
        installments: installments || "1/1",
      });
    }
  };

  const syncPersonTransaction = async (personName: string, date: string, description: string, amount: number, type: string) => {
    if (!user) return;
    const { data: peopleData } = await supabase
      .from("people")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", personName)
      .limit(1);
    if (peopleData && peopleData.length > 0) {
      await supabase.from("person_transactions").insert({
        person_id: peopleData[0].id,
        user_id: user.id,
        date,
        description,
        amount,
        type,
      });
    }
  };

  const add = async (tx: Omit<TransactionInsert, "transaction_group_id" | "installment_number" | "total_installments">) => {
    if (!user) return;
    const { error } = await supabase.from("transactions").insert({ ...tx, user_id: user.id });
    if (error) { toast({ title: "Erro ao adicionar transação", variant: "destructive" }); return; }
    if (tx.card) {
      await syncCardCharge(tx.card, tx.date, tx.description, tx.value);
    }
    if (tx.person) {
      const personDesc = tx.type === "despesa"
        ? `Despesa: ${tx.description} (deve para você)`
        : `Pagamento recebido: ${tx.description}`;
      const personAmount = tx.type === "receita" ? -tx.value : tx.value;
      const personTxType = tx.type === "receita" ? "pagamento" : "divida_pessoa";
      await syncPersonTransaction(tx.person, tx.date, personDesc, personAmount, personTxType);
    }
    await fetch();
  };

  const addInstallments = async (
    tx: Omit<TransactionInsert, "transaction_group_id" | "installment_number" | "total_installments" | "value">,
    totalAmount: number,
    totalInstallments: number
  ) => {
    if (!user || totalInstallments < 2) return;
    const groupId = crypto.randomUUID();
    const installmentAmount = Math.round((totalAmount / totalInstallments) * 100) / 100;
    const startDate = new Date(tx.date + "T12:00:00");

    const rows = Array.from({ length: totalInstallments }, (_, i) => {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + i);
      return {
        ...tx,
        user_id: user.id,
        value: i === totalInstallments - 1
          ? Math.round((totalAmount - installmentAmount * (totalInstallments - 1)) * 100) / 100
          : installmentAmount,
        date: formatLocalDate(d),
        description: `${tx.description} (${i + 1}/${totalInstallments})`,
        transaction_group_id: groupId,
        installment_number: i + 1,
        total_installments: totalInstallments,
      };
    });

    const { error } = await supabase.from("transactions").insert(rows);
    if (error) { toast({ title: "Erro ao criar parcelas", variant: "destructive" }); return; }
    if (tx.card) {
      for (const row of rows) {
        await syncCardCharge(tx.card, row.date, row.description, row.value, `${row.installment_number}/${row.total_installments}`);
      }
    }
    if (tx.person) {
      for (const row of rows) {
        const personDesc = tx.type === "despesa"
          ? `Despesa: ${row.description} (deve para você)`
          : `Pagamento recebido: ${row.description}`;
        const personAmount = tx.type === "receita" ? -row.value : row.value;
        const personTxType = tx.type === "receita" ? "pagamento" : "divida_pessoa";
        await syncPersonTransaction(tx.person, row.date, personDesc, personAmount, personTxType);
      }
    }
    await fetch();
  };

  const addMany = async (txs: Omit<TransactionInsert, "transaction_group_id" | "installment_number" | "total_installments">[]) => {
    if (!user) return;
    const rows = txs.map(tx => ({ ...tx, user_id: user.id }));
    const { error } = await supabase.from("transactions").insert(rows);
    if (error) { toast({ title: "Erro ao importar transações", variant: "destructive" }); return false; }
    await fetch();
    return true;
  };

  const update = async (id: string, tx: Partial<TransactionInsert>) => {
    // Get the old transaction to handle reverse sync before updating
    const oldTx = transactions.find(t => t.id === id);
    const { error } = await supabase.from("transactions").update(tx).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar transação", variant: "destructive" }); return; }

    // Reverse sync card_charges: remove old entry
    if (user && oldTx?.card) {
      const { data: oldCards } = await supabase
        .from("credit_cards").select("id").eq("user_id", user.id).eq("name", oldTx.card).limit(1);
      if (oldCards && oldCards.length > 0) {
        await supabase.from("card_charges").delete()
          .eq("card_id", oldCards[0].id).eq("user_id", user.id)
          .eq("date", oldTx.date).eq("description", oldTx.description).eq("value", oldTx.value);
      }
    }

    // Build the merged transaction
    const merged = { ...oldTx, ...tx };

    // Re-sync card_charges with new data
    if (user && merged.card) {
      const installmentLabel = merged.installment_number && merged.total_installments
        ? `${merged.installment_number}/${merged.total_installments}`
        : undefined;
      await syncCardCharge(merged.card, merged.date!, merged.description!, merged.value!, installmentLabel);
    }

    // Sync person_transactions: remove old entry and add new one if person is set
    if (user && oldTx?.person) {
      const { data: oldPeople } = await supabase
        .from("people").select("id").eq("user_id", user.id).eq("name", oldTx.person).limit(1);
      if (oldPeople && oldPeople.length > 0) {
        const oldPersonAmount = oldTx.type === "receita" ? -oldTx.value : oldTx.value;
        await supabase.from("person_transactions").delete()
          .eq("person_id", oldPeople[0].id).eq("user_id", user.id)
          .eq("date", oldTx.date).eq("amount", oldPersonAmount);
      }
    }

    // Re-sync person_transactions with new data
    const personName = merged.person;
    if (user && personName) {
      const personDesc = merged.type === "despesa"
        ? `Despesa: ${merged.description} (deve para você)`
        : `Pagamento recebido: ${merged.description}`;
      const personAmount = merged.type === "receita" ? -merged.value! : merged.value!;
      const personTxType = merged.type === "receita" ? "pagamento" : "divida_pessoa";
      await syncPersonTransaction(personName, merged.date!, personDesc, personAmount, personTxType);
    }

    await fetch();
  };

  const remove = async (id: string) => {
    // Find the transaction to check for card/person links before deleting
    const tx = transactions.find(t => t.id === id);
    if (tx && user) {
      // Reverse sync: remove matching card_charges
      if (tx.card) {
        const { data: cardsData } = await supabase
          .from("credit_cards").select("id").eq("user_id", user.id).eq("name", tx.card).limit(1);
        if (cardsData && cardsData.length > 0) {
          await supabase.from("card_charges").delete()
            .eq("card_id", cardsData[0].id).eq("user_id", user.id)
            .eq("date", tx.date).eq("description", tx.description).eq("value", tx.value);
        }
      }
      // Reverse sync: remove matching person_transactions
      if (tx.person) {
        const { data: peopleData } = await supabase
          .from("people").select("id").eq("user_id", user.id).eq("name", tx.person).limit(1);
        if (peopleData && peopleData.length > 0) {
          const personAmount = tx.type === "receita" ? -tx.value : tx.value;
          await supabase.from("person_transactions").delete()
            .eq("person_id", peopleData[0].id).eq("user_id", user.id)
            .eq("date", tx.date).eq("amount", personAmount);
        }
      }
    }
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao remover transação", variant: "destructive" }); return; }
    await fetch();
  };

  const removeFutureInstallments = async (groupId: string) => {
    const today = todayString();
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("transaction_group_id", groupId)
      .gt("date", today);
    if (error) { toast({ title: "Erro ao remover parcelas futuras", variant: "destructive" }); return; }
    await fetch();
  };

  const togglePaid = async (id: string, paid: boolean) => {
    const { error } = await supabase.from("transactions").update({ paid }).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar status", variant: "destructive" }); return; }
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, paid } : t));
  };

  return { transactions, loading, add, addInstallments, addMany, update, remove, removeFutureInstallments, togglePaid, refetch: fetch };
}
