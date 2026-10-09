/**
 * Supabase 客户端单例
 *
 * 用于浏览器端直接调用 Supabase（无需服务端）。
 * 项目采用静态导出（output: 'export'），@supabase/ssr 不适用，
 * 用 @supabase/supabase-js 的纯客户端模式即可。
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "[Supabase] 缺少环境变量 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

let client: SupabaseClient | null = null;

/**
 * 获取 Supabase 客户端（懒加载单例）
 * - 服务端调用时返回 null（静态导出无服务端运行）
 * - 浏览器端返回同一个实例，状态共享
 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!url || !anonKey) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        // 持久化登录态到 localStorage
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        // 静态导出无 server，使用 localStorage storage
        storage: window.localStorage,
        storageKey: "study-planner:supabase-auth",
      },
    });
  }
  return client;
}

/**
 * 等待 Supabase 客户端可用（处理初始化时序）
 */
export function getSupabaseOrThrow(): SupabaseClient {
  const c = getSupabase();
  if (!c) {
    throw new Error(
      "Supabase 客户端未初始化。请检查环境变量 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
    );
  }
  return c;
}