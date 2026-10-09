"use client";

/**
 * 当前用户状态 hook
 *
 * - 监听 Supabase auth state
 * - 提供 user / loading / isAuthenticated
 * - 初次加载时主动拉一次 session
 * - 异步初始化 supabase-js，不阻塞首屏
 */

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ensureSupabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  loading: boolean;
  /** 环境变量未配置时为 true，提示用户 */
  configMissing: boolean;
}

export function useCurrentUser(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [configMissing, setConfigMissing] = useState(false);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        const supabase = await ensureSupabase();
        if (!mounted) return;

        // 初次加载：拉当前 session
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setUser(data.session?.user ?? null);
        setLoading(false);

        // 订阅 auth state 变化
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          setUser(session?.user ?? null);
          setLoading(false);
        });
        unsubscribe = () => subscription.unsubscribe();
      } catch (e) {
        if (!mounted) return;
        const msg = (e as Error).message || "";
        if (msg.includes("环境变量未配置")) {
          setConfigMissing(true);
        } else {
          console.error("[useCurrentUser]", e);
        }
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  return { user, loading, configMissing };
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