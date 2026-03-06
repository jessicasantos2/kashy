import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CompanyAccount {
  id: string;
  user_id: string;
  name: string;
  bank: string;
  balance: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

type AccountForm = Pick<CompanyAccount, "name" | "bank" | "balance"> & { image_url?: string | null };

export function useCompanyAccounts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["company_accounts", user?.id];

  const { data: accounts = [], isLoading: loading } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_accounts" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return (data as any[]) as CompanyAccount[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (form: AccountForm) => {
      const { error } = await (supabase
        .from("company_accounts" as any)
        .insert({ ...form, user_id: user!.id }) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Conta adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar conta"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...form }: AccountForm & { id: string }) => {
      const { error } = await (supabase
        .from("company_accounts" as any)
        .update(form)
        .eq("id", id)
        .eq("user_id", user!.id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Conta atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar conta"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from("company_accounts" as any)
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast.success("Conta removida!");
    },
    onError: () => toast.error("Erro ao remover conta"),
  });

  return {
    accounts,
    loading,
    add: addMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  };
}
