/**
 * 任务到期桌面通知
 *
 * 规则：
 * - 每天首次打开应用时（如切到任务/日历页），如有逾期/今日未完成任务，弹出系统通知
 * - 用户点击"不再提醒"后写入 localStorage，当天不再弹
 * - 同一天内不重复弹（用 sessionStorage 标记本次 session 已弹过）
 */

import { getTasks } from "./tasks";
import { getDueStatus, daysOverdue } from "./task-due";

const LAST_PROMPT_KEY = "study-planner:due-prompt-date";

export interface DueNotificationSummary {
  overdue: { id: string; title: string; days: number }[];
  today: { id: string; title: string }[];
}

export function getDueSummary(): DueNotificationSummary {
  const tasks = getTasks().filter((t) => t.status !== "done");
  const overdue: DueNotificationSummary["overdue"] = [];
  const today: DueNotificationSummary["today"] = [];
  for (const t of tasks) {
    const status = getDueStatus(t.dueDate);
    if (status === "overdue" && t.dueDate) {
      overdue.push({ id: t.id, title: t.title, days: daysOverdue(t.dueDate) });
    } else if (status === "today") {
      today.push({ id: t.id, title: t.title });
    }
  }
  return { overdue, today };
}

/**
 * 是否应该弹通知？
 * - 同一天内只弹一次（localStorage 记录上次日期）
 * - 当天必须有逾期或今日到期任务
 */
export function shouldPromptDueToday(): boolean {
  if (typeof window === "undefined") return false;
  const today = new Date().toISOString().slice(0, 10);
  const last = localStorage.getItem(LAST_PROMPT_KEY);
  return last !== today;
}

export function markPromptedToday() {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  localStorage.setItem(LAST_PROMPT_KEY, today);
}

/**
 * 实际发送通知
 * - 先请求权限（如未授予）
 * - 构造一个汇总通知（避免 10 条任务弹 10 次）
 */
export async function promptDueNotification(summary: DueNotificationSummary) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission === "denied") return;
  if (summary.overdue.length === 0 && summary.today.length === 0) return;

  if (Notification.permission !== "granted") {
    const granted = await Notification.requestPermission();
    if (granted !== "granted") return;
  }

  const lines: string[] = [];
  if (summary.overdue.length > 0) {
    lines.push(
      `逾期 ${summary.overdue.length} 个：${summary.overdue
        .slice(0, 3)
        .map((t) => `${t.title}(${t.days}天)`)
        .join("、")}${summary.overdue.length > 3 ? "…" : ""}`,
    );
  }
  if (summary.today.length > 0) {
    lines.push(
      `今日到期 ${summary.today.length} 个：${summary.today
        .slice(0, 3)
        .map((t) => t.title)
        .join("、")}${summary.today.length > 3 ? "…" : ""}`,
    );
  }

  new Notification("📋 学习日程 · 任务提醒", {
    body: lines.join("\n"),
    tag: "study-planner-due-daily", // 同 tag 只保留一条
  });
}

/**
 * 一站式：检测 + 弹 + 标记
 */
export async function runDueNotifier() {
  if (!shouldPromptDueToday()) return;
  const summary = getDueSummary();
  if (summary.overdue.length === 0 && summary.today.length === 0) return;
  markPromptedToday();
  await promptDueNotification(summary);
}