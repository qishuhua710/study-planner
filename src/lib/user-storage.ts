/**
 * 用户隔离的存储层（localStorage）
 *
 * 使用方法：
 * - import { userStorage } from "@/lib/user-storage"
 * - 替换 localStorage.getItem 为 userStorage.getItem('key')
 * - 替换 localStorage.setItem 为 userStorage.setItem('key', value)
 * - 替换 localStorage.removeItem 为 userStorage.removeItem('key')
 *
 * 内部按当前登录用户隔离数据：
 * - 已登录：localStorage['<key>:<userId>']
 * - 匿名：localStorage['<key>']
 */

import { getSupabase } from "./supabase";

const ACTIVE_USER_KEY = "study-planner:active-user-id";
let currentUserId: string | null = null;
let initialized = false;

export function initUserStorage(): void {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  const supabase = getSupabase();
  if (!supabase) return;
  supabase.auth.getSession().then(({ data }) => {
    setCurrentUserId(data.session?.user?.id ?? null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    setCurrentUserId(session?.user?.id ?? null);
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
    localStorage.setItem(scoped(baseKey), value);
  },
  removeItem(baseKey: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(scoped(baseKey));
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
};

/** 触发 data-changed 事件 */
export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("study-planner:data-changed"));
  }
}