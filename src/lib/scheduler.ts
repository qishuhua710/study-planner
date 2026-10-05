/**
 * 智能排程核心逻辑
 * 检测占用（课程+假期+休息时段）→ 找空闲时段 → 按优先级填入任务
 */

import {
  getCoursesOnDate,
  getPeriodTimes,
  isHoliday,
  type Weekday,
} from "./course-storage";

export type Priority = "high" | "medium" | "low";
export type Status = "todo" | "in_progress" | "done";

export interface TaskForScheduling {
  id: string;
  title: string;
  priority: Priority;
  status: Status;
  estimatedMinutes?: number; // 预估耗时（默认 25 分钟）
}

export interface SuggestedBlock {
  taskId: string;
  taskTitle: string;
  priority: Priority;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  duration: number; // 分钟
}

/** 一天内的时段（分钟数） */
interface TimeRange {
  startMin: number; // 从 00:00 起的分钟数
  endMin: number;
}

/** 一天的"不排程"时段（吃饭+睡觉） */
const MEAL_BREAKS: TimeRange[] = [
  { startMin: 12 * 60, endMin: 13 * 60 }, // 午饭
  { startMin: 18 * 60, endMin: 19 * 60 }, // 晚饭
];

/** 不晚于这个时间排程（22:00 后不排） */
const LATEST_END_MIN = 22 * 60;

/** 块间最小缓冲（分钟） */
const BUFFER_MIN = 15;

/** 单个学习块最小/最大时长 */
const MIN_BLOCK_MIN = 25;
const MAX_BLOCK_MIN = 50;

/** 假期允许的最大任务数 */
const HOLIDAY_MAX_TASKS = 3;

/**
 * 把 "HH:mm" 转换为分钟数
 */
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 把分钟数转换为 "HH:mm"
 */
function formatTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * 计算一天的占用时段（课程 + 假期标记为整天）
 */
function getOccupiedRanges(date: Date): TimeRange[] {
  const ranges: TimeRange[] = [];
  const courses = getCoursesOnDate(date);

  for (const { session } of courses) {
    ranges.push({
      startMin: parseTime(session.startTime),
      endMin: parseTime(session.endTime),
    });
  }

  return mergeRanges(ranges);
}

/**
 * 合并重叠时段
 */
function mergeRanges(ranges: TimeRange[]): TimeRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.startMin - b.startMin);
  const merged: TimeRange[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const curr = sorted[i];
    if (curr.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, curr.endMin);
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}

/**
 * 计算一天的可用时段（24h 减去占用和吃饭时段）
 */
export function findFreeSlots(date: Date): TimeRange[] {
  // 假期：只允许 9:00-22:00 中的若干段
  if (isHoliday(date)) {
    return [{ startMin: 9 * 60, endMin: LATEST_END_MIN }];
  }

  // 占用时段（课程）
  const occupied = getOccupiedRanges(date);
  // 合并吃饭时段（视为占用）
  const allOccupied = mergeRanges([...occupied, ...MEAL_BREAKS]);

  // 从 8:00 到 22:00 中减去占用
  const dayStart = 8 * 60;
  const dayEnd = LATEST_END_MIN;
  const free: TimeRange[] = [];
  let cursor = dayStart;

  for (const range of allOccupied) {
    // 跳过完全在范围外的
    if (range.endMin <= dayStart) continue;
    if (range.startMin >= dayEnd) break;
    // 截断到当日范围
    const rStart = Math.max(range.startMin, dayStart);
    const rEnd = Math.min(range.endMin, dayEnd);
    // 加入前面的空闲
    if (rStart > cursor) {
      free.push({ startMin: cursor, endMin: rStart });
    }
    cursor = Math.max(cursor, rEnd);
  }

  // 加入末尾空闲
  if (cursor < dayEnd) {
    free.push({ startMin: cursor, endMin: dayEnd });
  }

  return free;
}

/**
 * 优先级权重（数值越大越优先）
 */
function priorityWeight(p: Priority): number {
  return p === "high" ? 3 : p === "medium" ? 2 : 1;
}

/**
 * 半自动排程：在指定日期把任务填入空闲时段
 */
export function suggestSchedule(
  date: Date,
  tasks: TaskForScheduling[],
  options: { maxBlocks?: number } = {},
): SuggestedBlock[] {
  const { maxBlocks = 10 } = options;
  const isHolidayDay = !!isHoliday(date);
  const blockLimit = isHolidayDay
    ? HOLIDAY_MAX_TASKS
    : maxBlocks;

  // 过滤未完成的任务，按优先级排序
  const pending = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority));

  const freeSlots = findFreeSlots(date);
  const suggestions: SuggestedBlock[] = [];

  for (const task of pending) {
    if (suggestions.length >= blockLimit) break;

    const duration = Math.max(
      MIN_BLOCK_MIN,
      Math.min(MAX_BLOCK_MIN, task.estimatedMinutes ?? 30),
    );

    // 找一个能放下这个时段的空闲段
    const slot = freeSlots.find((s) => s.endMin - s.startMin >= duration);
    if (!slot) break;

    const startMin = slot.startMin;
    const endMin = startMin + duration;

    suggestions.push({
      taskId: task.id,
      taskTitle: task.title,
      priority: task.priority,
      startTime: formatTime(startMin),
      endTime: formatTime(endMin),
      duration,
    });

    // 更新空闲段，加上缓冲
    slot.startMin = endMin + BUFFER_MIN;
  }

  return suggestions;
}

/**
 * 跨周排程：返回一个为期 7 天的建议表
 */
export function suggestWeekSchedule(
  startDate: Date,
  tasks: TaskForScheduling[],
): Map<string, SuggestedBlock[]> {
  const result = new Map<string, SuggestedBlock[]>();
  // 每过一个排程日，任务池减去已排的
  let pool = [...tasks];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const blocks = suggestSchedule(d, pool);
    result.set(key, blocks);
    // 移除已排的
    const usedIds = new Set(blocks.map((b) => b.taskId));
    pool = pool.filter((t) => !usedIds.has(t.id));
  }

  return result;
}
