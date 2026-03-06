import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  display_name: string | null;
  avatar_url: string | null;
}

interface AdminData {
  users: AdminUser[];
  stats: { totalUsers: number; totalTransactions: number; totalAccounts: number };
}

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminData | null>(null);

  // Check if current user is admin
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => {
        setIsAdmin(!!data);
        setLoading(false);
      });
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) return;
    
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=list`,
      { headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
    );
    const result = await res.json();
    if (res.ok) setData(result);
  }, [isAdmin]);

  const setRole = async (userId: string, role: string, remove = false) => {
    await supabase.functions.invoke("admin-users?action=set-role", {
      body: { userId, role, remove },
    });
    await fetchData();
  };

  const deleteUser = async (userId: string) => {
    const res = await supabase.functions.invoke("admin-users?action=delete-user", {
      body: { userId },
    });
    if (res.error) throw res.error;
    await fetchData();
  };

  return { isAdmin, loading, data, fetchData, setRole, deleteUser };
}
