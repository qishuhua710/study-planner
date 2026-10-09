"use client";

/**
 * 当前用户状态 hook
 *
 * - 监听 Supabase auth state
 * - 提供 user / loading / isAuthenticated
 * - 初次加载时主动拉一次 session
 */

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useCurrentUser(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 初次加载：拉当前 session
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // 订阅 auth state 变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}

/**
 * 当前用户的 id（便捷 hook）
 */
export function useCurrentUserId(): string | null {
  const { user } = useCurrentUser();
  return user?.id ?? null;
}

/**
 * 是否已登录（便捷 hook）
 */
export function useIsAuthenticated(): boolean {
  const { user } = useCurrentUser();
  return !!user;
}