import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 服务端 Supabase 客户端（App Router Server Component / Route Handler 用）
 *
 * 基于 Cookie 的会话管理，支持 SSR 时的用户态透传。
 * 未配置环境变量时返回 null。
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn(
      "[Supabase] 服务端未配置环境变量，跳过创建 client。请填写 .env.local。",
    );
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{
          name: string;
          value: string;
          options: CookieOptions;
        }>,
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // 在 Server Component 中调用 set 会被忽略（只能通过 Route Handler / Middleware 设置）
        }
      },
    },
  });
}
