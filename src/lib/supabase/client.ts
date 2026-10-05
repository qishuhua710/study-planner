import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 浏览器端 Supabase 客户端
 *
 * 环境变量未配置时返回 null 并打 warn，方便开发期未注册账号时也能跑框架。
 * 调用方需对 null 做兜底（提示去设置页填写配置）。
 */
export function createClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window !== "undefined") {
      console.warn(
        "[Supabase] 未配置 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY。" +
          "请在 .env.local 填写后重启 dev server（参见 .env.local.example）。",
      );
    }
    return null;
  }

  return createBrowserClient(url, anonKey);
}
