/**
 * Supabase 客户端单例
 *
 * 用于浏览器端直接调用 Supabase（无需服务端）。
 * 项目采用静态导出（output: 'export'），@supabase/ssr 不适用，
 * 用 @supabase/supabase-js 的纯客户端模式即可。
 *
 * 性能优化：supabase-js 体积较大（~150KB），按需懒加载，
 * 避免污染未访问认证页面的用户的首屏 bundle。
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "[Supabase] 缺少环境变量 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * 异步获取 Supabase 客户端（懒加载单例）
 * - 第一次调用会动态 import supabase-js，避免污染首屏
 * - 服务端调用时返回 null（静态导出无服务端运行）
 * - 浏览器端返回同一个实例，状态共享
 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (!url || !anonKey) return null;
  if (client) return client;
  // 触发异步加载
  loadClient();
  return null;
}

/** 内部：异步加载 supabase-js 并创建客户端 */
async function loadClient(): Promise<SupabaseClient | null> {
  if (client) return client;
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const { createClient } = await import("@supabase/supabase-js");
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: window.localStorage,
        storageKey: "study-planner:supabase-auth",
      },
    });
    return client;
  })();
  return clientPromise;
}

/**
 * 异步获取 Supabase 客户端，确保已初始化
 * 用法：const supabase = await ensureSupabase()
 */
export async function ensureSupabase(): Promise<SupabaseClient> {
  if (typeof window === "undefined") {
    throw new Error("Supabase 仅在浏览器端可用");
  }
  if (!url || !anonKey) {
    throw new Error(
      "Supabase 环境变量未配置。请检查 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY。",
    );
  }
  if (client) return client;
  const c = await loadClient();
  if (!c) throw new Error("Supabase 客户端初始化失败");
  return c;
}

/**
 * 兼容旧 API：同步获取（已存在则返回，否则 null）
 * @deprecated 推荐用 ensureSupabase() 异步获取
 */
export function getSupabaseOrThrow(): SupabaseClient {
  const c = getSupabase();
  if (!c) {
    throw new Error(
      "Supabase 客户端未就绪（首次调用请用 await ensureSupabase()）",
    );
  }
  return c;
}