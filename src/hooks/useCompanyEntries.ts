import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CompanyEntry {
  id: string;
  user_id: string;
  type: "revenue" | "expense";
  date: string;
  description: string;
  amount: number;
  category: string;
  company_account_id: string;
  created_at: string;
  updated_at: string;
}

type EntryForm = Pick<CompanyEntry, "type" | "date" | "description" | "amount" | "category" | "company_account_id">;

export function useCompanyEntries() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["company_entries", user?.id];

  const { data: entries = [], isLoading: loading } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_entries" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("date", { ascending: false });
      if (error) throw error;
      return (data as any[]) as CompanyEntry[];
    },
  });

  const revenues = entries.filter((e) => e.type === "revenue");
  const expenses = entries.filter((e) => e.type === "expense");

  const addMutation = useMutation({
    mutationFn: async (form: EntryForm) => {
      const { error } = await (supabase
        .from("company_entries" as any)
        .insert({ ...form, user_id: user!.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Lançamento adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar lançamento"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...form }: EntryForm & { id: string }) => {
      const { error } = await (supabase
        .from("company_entries" as any)
        .update(form)
        .eq("id", id)
        .eq("user_id", user!.id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Lançamento atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar lançamento"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("company_entries" as any)
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Lançamento removido!");
    },
    onError: () => toast.error("Erro ao remover lançamento"),
  });

  return {
    revenues,
    expenses,
    loading,
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}
