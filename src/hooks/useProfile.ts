import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Profile {
  id: string;
  display_name: string | null;
  salary: number | null;
  avatar_url: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, salary, avatar_url")
      .eq("user_id", user.id)
      .single();
    setProfile(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const updateProfile = async (updates: { display_name?: string; salary?: number; avatar_url?: string }) => {
    if (!user || !profile) return;
    await supabase.from("profiles").update(updates).eq("id", profile.id);
    await fetch();
  };

  return { profile, loading, updateProfile, refetch: fetch };
}
