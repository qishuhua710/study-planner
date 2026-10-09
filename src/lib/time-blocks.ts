/**
 * 时间块数据层
 * Phase 1：localStorage 持久化（mock）
 * Phase 3：迁移到 Supabase time_blocks 表
 */

import { userStorage, notifyDataChanged } from "./user-storage";

export interface TimeBlock {
  id: string;
  title: string;
  startTime: string; // "yyyy-MM-dd HH:mm"
  endTime: string; // "yyyy-MM-dd HH:mm"
  taskId?: string; // 关联任务（可选）
  color?: string; // 自定义颜色
  createdAt: string;
}

const KEY = "study-planner:time-blocks";

function readAll(): TimeBlock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = userStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as TimeBlock[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: TimeBlock[]): void {
  if (typeof window === "undefined") return;
  userStorage.setItem(KEY, JSON.stringify(list));
  notifyDataChanged();
}

export function getTimeBlocks(): TimeBlock[] {
  return readAll();
}

/** 覆盖式写入整个时间块列表（用于导入备份） */
export function setTimeBlocks(blocks: TimeBlock[]): void {
  writeAll(blocks);
}

/**
 * 检测时间块冲突
 * 给定新的起止时间，返回与现有时间块重叠的块（不含 ID 为 excludeId 的块，用于编辑模式）
 */
export function detectConflicts(
  startTime: string,
  endTime: string,
  excludeId?: string,
): TimeBlock[] {
  const newStart = toMinutes(startTime);
  const newEnd = toMinutes(endTime);
  if (newStart >= newEnd) return [];

  return readAll().filter((b) => {
    if (excludeId && b.id === excludeId) return false;
    const bStart = toMinutes(b.startTime);
    const bEnd = toMinutes(b.endTime);
    // 重叠判定：newStart < bEnd && newEnd > bStart
    return newStart < bEnd && newEnd > bStart;
  });
}

/** 把 "yyyy-MM-dd HH:mm" 转为当日分钟数 */
function toMinutes(dateTime: string): number {
  const time = extractTime(dateTime);
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 把时间块平移到新的日期（保持时段不变）
 * @param id 时间块 ID
 * @param newDate 新日期 "yyyy-MM-dd"
 */
export function moveTimeBlockToDate(id: string, newDate: string): void {
  const list = readAll();
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return;
  const block = list[idx];
  const oldDate = extractDate(block.startTime);
  if (oldDate === newDate) return;
  // 替换日期前缀，时段不变
  const newStart = `${newDate} ${extractTime(block.startTime)}`;
  const newEnd = `${newDate} ${extractTime(block.endTime)}`;
  list[idx] = { ...block, startTime: newStart, endTime: newEnd };
  writeAll(list);
}

/**
 * 把时间块重新定位到新日期 + 新起始时段（保持时长）
 * @param id 时间块 ID
 * @param newDate 新日期 "yyyy-MM-dd"
 * @param newStartMinutes 新起始时段（分钟数 0-1440）
 */
export function moveTimeBlockToTime(
  id: string,
  newDate: string,
  newStartMinutes: number,
): void {
  const list = readAll();
  const idx = list.findIndex((b) => b.id === id);
  if (idx < 0) return;
  const block = list[idx];
  const durationMin = toMinutes(block.endTime) - toMinutes(block.startTime);
  const newEndMinutes = newStartMinutes + durationMin;
  if (newEndMinutes > 24 * 60) return; // 跨日不支持
  list[idx] = {
    ...block,
    startTime: `${newDate} ${minutesToTime(newStartMinutes)}`,
    endTime: `${newDate} ${minutesToTime(newEndMinutes)}`,
  };
  writeAll(list);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getTimeBlocksForDate(date: string): TimeBlock[] {
  // date 格式 "yyyy-MM-dd"，匹配时间块 startTime 的日期部分
  return readAll().filter((b) => b.startTime.startsWith(date));
}

export function addTimeBlock(block: Omit<TimeBlock, "id" | "createdAt">): TimeBlock {
  const newBlock: TimeBlock = {
    ...block,
    id: `tb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const list = readAll();
  list.push(newBlock);
  writeAll(list);
  return newBlock;
}

export function addTimeBlocks(
  blocks: Array<Omit<TimeBlock, "id" | "createdAt">>,
): TimeBlock[] {
  const now = new Date().toISOString();
  const newBlocks: TimeBlock[] = blocks.map((b) => ({
    ...b,
    id: `tb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
  }));
  writeAll([...readAll(), ...newBlocks]);
  return newBlocks;
}

export function updateTimeBlock(id: string, updates: Partial<TimeBlock>): void {
  const list = readAll();
  const idx = list.findIndex((b) => b.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    writeAll(list);
  }
}

export function removeTimeBlock(id: string): void {
  writeAll(readAll().filter((b) => b.id !== id));
}

export function generateId(): string {
  return `tb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 把 "yyyy-MM-dd" + "HH:mm" 合成 "yyyy-MM-dd HH:mm" */
export function combineDateTime(date: string, time: string): string {
  return `${date} ${time}`;
}

/** 从 "yyyy-MM-dd HH:mm" 提取日期部分 */
export function extractDate(dateTime: string): string {
  return dateTime.split(" ")[0];
}

/** 从 "yyyy-MM-dd HH:mm" 提取时间部分 */
export function extractTime(dateTime: string): string {
  return dateTime.split(" ")[1] ?? "";
}
