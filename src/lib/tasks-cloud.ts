/**
 * Tasks 数据云端层（Supabase）
 *
 * 替换原来的 localStorage 实现。
 * - 旧 API 兼容层见 ./tasks.ts
 * - 通过 user_id 自动隔离
 * - 数据模型：snake_case <-> camelCase 双向转换
 */

import { getSupabaseOrThrow } from "./supabase";

export type Priority = "low" | "medium" | "high" | "urgent";
export type Status = "todo" | "in_progress" | "done" | "archived";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  dueDate?: string;
  categoryId?: string;
  category: string;
  tags: string[];
  estimatedMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

interface DbTaskRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  category_id: string | null;
  category: string;
  tags: unknown;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
}

function rowToTask(row: DbTaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    priority: row.priority as Priority,
    status: row.status as Status,
    dueDate: row.due_date ?? undefined,
    categoryId: row.category_id ?? undefined,
    category: row.category,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    estimatedMinutes: row.estimated_minutes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function taskToRow(task: Partial<Task>, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = { user_id: userId };
  if (task.id !== undefined) row.id = task.id;
  if (task.title !== undefined) row.title = task.title;
  if (task.description !== undefined) row.description = task.description ?? null;
  if (task.priority !== undefined) row.priority = task.priority;
  if (task.status !== undefined) row.status = task.status;
  if (task.dueDate !== undefined) row.due_date = task.dueDate ?? null;
  if (task.categoryId !== undefined) row.category_id = task.categoryId ?? null;
  if (task.category !== undefined) row.category = task.category;
  if (task.tags !== undefined) row.tags = task.tags;
  if (task.estimatedMinutes !== undefined)
    row.estimated_minutes = task.estimatedMinutes ?? null;
  return row;
}

/** 加载当前用户的所有任务 */
export async function loadTasks(): Promise<Task[]> {
  const supabase = getSupabaseOrThrow();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DbTaskRow[]).map(rowToTask);
}

/** 插入一条任务 */
export async function insertTask(
  userId: string,
  task: Omit<Task, "createdAt" | "updatedAt">,
): Promise<Task> {
  const supabase = getSupabaseOrThrow();
  const row = taskToRow(task, userId);
  const { data, error } = await supabase
    .from("tasks")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return rowToTask(data as DbTaskRow);
}

/** 更新任务 */
export async function updateTaskRow(
  userId: string,
  id: string,
  updates: Partial<Task>,
): Promise<Task> {
  const supabase = getSupabaseOrThrow();
  const row = taskToRow(updates, userId);
  const { data, error } = await supabase
    .from("tasks")
    .update(row)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return rowToTask(data as DbTaskRow);
}

/** 删除任务 */
export async function deleteTaskRow(userId: string, id: string): Promise<void> {
  const supabase = getSupabaseOrThrow();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

/** 批量更新任务状态 */
export async function updateTaskStatusBulk(
  userId: string,
  ids: string[],
  status: Status,
): Promise<void> {
  const supabase = getSupabaseOrThrow();
  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", userId);
  if (error) throw error;
}

/** 批量删除任务 */
export async function deleteTasksBulk(
  userId: string,
  ids: string[],
): Promise<void> {
  const supabase = getSupabaseOrThrow();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .in("id", ids)
    .eq("user_id", userId);
  if (error) throw error;
}

export function generateTaskId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}