/**
 * 任务到期状态工具
 *
 * 把 dueDate 解析为人类可读的"紧急程度"标识，用于：
 * - 任务列表分组（逾期 / 今日 / 明日 / 本周 / 之后）
 * - 日历单元格高亮
 * - 桌面通知文案
 * - 导航徽章计数
 */

import { parseISO, isToday, isTomorrow, isThisWeek, isBefore, startOfDay } from "date-fns";

export type DueStatus = "overdue" | "today" | "tomorrow" | "thisWeek" | "later" | "none";

/**
 * 解析单个任务的到期状态
 * @param dueDate "yyyy-MM-dd" 格式；undefined 时返回 "none"
 * @param now 当前时间（默认 new Date()，用于单测注入）
 */
export function getDueStatus(
  dueDate: string | undefined,
  now: Date = new Date(),
): DueStatus {
  if (!dueDate) return "none";
  const d = parseISO(dueDate);
  const todayStart = startOfDay(now);

  // 过期：严格小于今天的开始
  if (isBefore(d, todayStart)) return "overdue";
  if (isToday(d)) return "today";
  if (isTomorrow(d)) return "tomorrow";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "thisWeek";
  return "later";
}

/** 中文显示文案 */
export const dueStatusLabel: Record<DueStatus, string> = {
  overdue: "逾期",
  today: "今天",
  thisWeek: "本周",
  tomorrow: "明天",
  later: "之后",
  none: "无截止日",
};

/** 紧急度 → Tailwind 颜色类名（用于列表行徽章） */
export const dueStatusColor: Record<DueStatus, string> = {
  overdue: "text-destructive bg-destructive/10",
  today: "text-[#A45C3D] bg-[#A45C3D]/10",
  tomorrow: "text-[#8B7E6B] bg-[#8B7E6B]/10",
  thisWeek: "text-[#5C8A6B] bg-[#5C8A6B]/10",
  later: "text-muted-foreground bg-muted",
  none: "text-muted-foreground bg-muted",
};

/** 排序权重（值越小越靠前） */
export const dueStatusOrder: Record<DueStatus, number> = {
  overdue: 0,
  today: 1,
  tomorrow: 2,
  thisWeek: 3,
  later: 4,
  none: 5,
};

/**
 * 分组：把任务按到期状态聚合
 * - 默认排除 done（已完成的任务不计入紧急度）
 * - 返回值保留所有状态键，但调用方按需渲染
 */
export function groupTasksByDue<T extends { dueDate?: string; status: string }>(
  tasks: T[],
  now: Date = new Date(),
): Record<DueStatus, T[]> {
  const groups: Record<DueStatus, T[]> = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    none: [],
  };
  for (const t of tasks) {
    const status = getDueStatus(t.dueDate, now);
    groups[status].push(t);
  }
  return groups;
}

/**
 * 给桌面倒计时 / 通知用的简短文案
 */
export function dueStatusToastText(
  status: DueStatus,
  title: string,
  daysOverdue = 0,
): string {
  switch (status) {
    case "overdue":
      return `已逾期 ${daysOverdue} 天：${title}`;
    case "today":
      return `今日到期：${title}`;
    case "tomorrow":
      return `明日到期：${title}`;
    default:
      return title;
  }
}

/**
 * 计算逾期天数（用于文案）
 */
export function daysOverdue(dueDate: string, now: Date = new Date()): number {
  const d = startOfDay(parseISO(dueDate));
  const today = startOfDay(now);
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}