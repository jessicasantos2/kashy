import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_CATEGORIES, getDefaultCategoryMeta } from "@/data/categories";

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface CategoryMeta {
  name: string;
  icon: string;
  color: string;
}

export function useCategories() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase.from("categories" as any)
      .select("id, name, icon, color")
      .eq("user_id", user.id)
      .order("name") as any);

    if (error) {
      toast({ title: "Erro ao carregar categorias", variant: "destructive" });
      return;
    }

    setCategories(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addCategory = async (name: string, icon = "tag", color = "#6366f1") => {
    if (!user) return;
    const { error } = await (supabase.from("categories" as any).insert({ name, icon, color, user_id: user.id }) as any);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Categoria já existe", variant: "destructive" });
      } else {
        toast({ title: "Erro ao adicionar categoria", variant: "destructive" });
      }
      return;
    }
    await fetch();
  };

  const updateCategory = async (id: string, updates: { name?: string; icon?: string; color?: string }) => {
    const { error } = await (supabase.from("categories" as any).update(updates).eq("id", id) as any);
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Categoria já existe", variant: "destructive" });
      } else {
        toast({ title: "Erro ao atualizar categoria", variant: "destructive" });
      }
      return;
    }
    await fetch();
  };

  const removeCategory = async (id: string) => {
    const { error } = await (supabase.from("categories" as any).delete().eq("id", id) as any);
    if (error) {
      toast({ title: "Erro ao remover categoria", variant: "destructive" });
      return;
    }
    await fetch();
  };

  // Combined list with metadata
  const allCategories: CategoryMeta[] = (() => {
    const userMetas: CategoryMeta[] = categories.map(c => ({ name: c.name, icon: c.icon, color: c.color }));
    const userNames = new Set(userMetas.map(c => c.name));
    const combined = [...userMetas];
    for (const def of DEFAULT_CATEGORIES) {
      if (!userNames.has(def.name)) combined.push({ name: def.name, icon: def.icon, color: def.color });
    }
    return combined.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  })();

  const allCategoryNames = allCategories.map(c => c.name);

  const getCategoryMeta = (name: string): { icon: string; color: string } => {
    const userCat = categories.find(c => c.name === name);
    if (userCat) return { icon: userCat.icon, color: userCat.color };
    return getDefaultCategoryMeta(name);
  };

  return { categories, allCategories, allCategoryNames, loading, addCategory, updateCategory, removeCategory, getCategoryMeta, refetch: fetch };
}
