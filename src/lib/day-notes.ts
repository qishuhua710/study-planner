/**
 * 日期备注 + 重点标注 数据层
 * Phase 1：localStorage 持久化（mock）
 * Phase 3：迁移到 Supabase day_notes 表
 */

import { userStorage } from "./user-storage";

export interface DayNote {
  date: string; // "yyyy-MM-dd" 作为主键
  note: string; // 备注文本（可空字符串 = 无备注）
  starred: boolean; // 是否重点标注
  updatedAt: string; // ISO 时间戳
}

const KEY = "study-planner:day-notes";

function readAll(): Record<string, DayNote> {
  if (typeof window === "undefined") return {};
  try {
    const raw = userStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, DayNote>) : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, DayNote>): void {
  if (typeof window === "undefined") return;
  userStorage.setItem(KEY, JSON.stringify(map));
}

/** 获取某天的备注记录（没有则返回空对象，不创建） */
export function getDayNote(date: string): DayNote | null {
  return readAll()[date] ?? null;
}

/** 获取某天的备注文本（无则空串） */
export function getNoteText(date: string): string {
  return readAll()[date]?.note ?? "";
}

/** 是否重点标注 */
export function isStarred(date: string): boolean {
  return readAll()[date]?.starred ?? false;
}

/** 设置或更新某天的备注 */
export function setNote(date: string, note: string): void {
  const map = readAll();
  const existing = map[date];
  map[date] = {
    date,
    note,
    starred: existing?.starred ?? false,
    updatedAt: new Date().toISOString(),
  };
  writeAll(map);
}

/** 切换/设置重点标注 */
export function setStarred(date: string, starred: boolean): void {
  const map = readAll();
  const existing = map[date];
  map[date] = {
    date,
    note: existing?.note ?? "",
    starred,
    updatedAt: new Date().toISOString(),
  };
  writeAll(map);
}

/** 切换重点标注（返回新状态） */
export function toggleStarred(date: string): boolean {
  const next = !isStarred(date);
  setStarred(date, next);
  return next;
}

/** 删除某天的备注记录（清除备注和重点） */
export function clearDayNote(date: string): void {
  const map = readAll();
  delete map[date];
  writeAll(map);
}

/** 获取所有有备注的日期（用于日历标记） */
export function getAllDatesWithNotes(): string[] {
  return Object.keys(readAll()).filter((d) => {
    const n = readAll()[d];
    return n && (n.note || n.starred);
  });
}
