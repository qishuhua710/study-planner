/**
 * 用户隔离的存储层（localStorage + Supabase 同步）
 *
 * 使用方法：
 * - import { userStorage } from "@/lib/user-storage"
 * - 替换 localStorage.getItem 为 userStorage.getItem('key')
 * - 替换 localStorage.setItem 为 userStorage.setItem('key', value)
 * - 替换 localStorage.removeItem 为 userStorage.removeItem('key')
 *
 * 内部按当前登录用户隔离数据：
 * - 已登录：localStorage['<key>:<userId>'] + Supabase user_data 表
 * - 匿名：localStorage['<key>']
 *
 * 云同步策略：
 * - 登录时自动从云端拉取并合并到本地
 * - 本地写操作防抖 1 秒后同步到云端
 * - 离线时只写本地，恢复网络后下次写入自动同步
 */

import { ensureSupabase } from "./supabase";

const ACTIVE_USER_KEY = "study-planner:active-user-id";
let currentUserId: string | null = null;
let initialized = false;

// 云同步防抖：避免每次 setItem 都触发网络请求
const pendingSync = new Map<string, string>();
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 1000;

export function initUserStorage(): void {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  ensureSupabase()
    .then(async (supabase) => {
      const { data: sessionData } = await supabase.auth.getSession();
      setCurrentUserId(sessionData.session?.user?.id ?? null);

      // 登录后立即拉取云端数据
      if (sessionData.session?.user?.id) {
        await pullAllFromCloud();
      }

      supabase.auth.onAuthStateChange(async (_event, session) => {
        const newUid = session?.user?.id ?? null;
        const oldUid = currentUserId;
        setCurrentUserId(newUid);
        // 账号切换时重新拉取
        if (newUid && newUid !== oldUid) {
          await pullAllFromCloud();
        }
      });
    })
    .catch(() => {
      // 环境变量未配置，未登录模式也能用
    });
}

export function setCurrentUserId(userId: string | null): void {
  currentUserId = userId;
  if (typeof window !== "undefined") {
    if (userId) {
      localStorage.setItem(ACTIVE_USER_KEY, userId);
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  }
}

export function getCurrentUserId(): string | null {
  if (currentUserId) return currentUserId;
  if (typeof window !== "undefined") {
    return localStorage.getItem(ACTIVE_USER_KEY);
  }
  return null;
}

function scoped(baseKey: string): string {
  const uid = getCurrentUserId();
  return uid ? `${baseKey}:${uid}` : baseKey;
}

export const userStorage = {
  getItem(baseKey: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(scoped(baseKey));
  },
  setItem(baseKey: string, value: string): void {
    if (typeof window === "undefined") return;
    const fullKey = scoped(baseKey);
    localStorage.setItem(fullKey, value);
    scheduleCloudSync(baseKey, value);
  },
  removeItem(baseKey: string): void {
    if (typeof window === "undefined") return;
    const fullKey = scoped(baseKey);
    localStorage.removeItem(fullKey);
    scheduleCloudDelete(baseKey);
  },
  /** 返回当前用户实际存储的所有 key（用于数据清理） */
  getAllUserKeys(): string[] {
    if (typeof window === "undefined") return [];
    const uid = getCurrentUserId();
    if (!uid) {
      return Object.keys(localStorage).filter((k) =>
        k.startsWith("study-planner:"),
      );
    }
    return Object.keys(localStorage).filter((k) =>
      k.endsWith(`:${uid}`),
    );
  },
  /** 强制立即同步（用于用户退出登录前） */
  async flushSync(): Promise<void> {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    await flushPending();
  },
};

/** 触发 data-changed 事件 */
export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("study-planner:data-changed"));
  }
}

/* ============ 云同步（异步，最佳努力） ============ */

function scheduleCloudSync(baseKey: string, value: string) {
  if (!currentUserId) return;
  pendingSync.set(baseKey, value);
  if (syncTimer) return;
  syncTimer = setTimeout(() => {
    flushPending().catch(() => {});
    syncTimer = null;
  }, SYNC_DEBOUNCE_MS);
}

function scheduleCloudDelete(baseKey: string) {
  if (!currentUserId) return;
  pendingSync.set(baseKey, "__DELETE__");
  if (syncTimer) return;
  syncTimer = setTimeout(() => {
    flushPending().catch(() => {});
    syncTimer = null;
  }, SYNC_DEBOUNCE_MS);
}

async function flushPending(): Promise<void> {
  if (pendingSync.size === 0) return;
  if (!currentUserId) {
    pendingSync.clear();
    return;
  }
  const supabase = await ensureSupabase().catch(() => null);
  if (!supabase) {
    pendingSync.clear();
    return;
  }
  const deletes: string[] = [];
  const upserts: { key: string; value: string }[] = [];
  pendingSync.forEach((v, k) => {
    if (v === "__DELETE__") deletes.push(k);
    else upserts.push({ key: k, value: v });
  });
  pendingSync.clear();

  try {
    if (upserts.length > 0) {
      const rows = upserts.map((u) => ({
        user_id: currentUserId,
        key: u.key,
        value: u.value,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase
        .from("user_data")
        .upsert(rows, { onConflict: "user_id,key" });
      if (error) throw error;
    }
    for (const k of deletes) {
      await supabase
        .from("user_data")
        .delete()
        .eq("user_id", currentUserId)
        .eq("key", k);
    }
  } catch (e) {
    console.error("[user-storage] 云同步失败", e);
  }
}

async function pullAllFromCloud(): Promise<void> {
  if (!currentUserId) return;
  const supabase = await ensureSupabase().catch(() => null);
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from("user_data")
      .select("*")
      .eq("user_id", currentUserId);
    if (error) throw error;
    if (!data || data.length === 0) return;
    for (const row of data) {
      const localKey = scoped(row.key);
      // 云端版本优先：仅当本地没有时才写入
      if (localStorage.getItem(localKey) === null) {
        localStorage.setItem(localKey, row.value);
      }
    }
    // 通知数据层刷新
    notifyDataChanged();
  } catch (e) {
    console.error("[user-storage] 拉取云端数据失败", e);
  }
}