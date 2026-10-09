/**
 * 任务数据层
 * Phase 1：localStorage 持久化（mock）
 * Phase 3：迁移到 Supabase tasks 表
 */

import { mockTasks, type Priority, type Status } from "./mock-data";
import { userStorage, notifyDataChanged } from "./user-storage";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  dueDate?: string; // "yyyy-MM-dd"
  categoryId?: string; // 关联分类 ID（新）
  category: string; // 分类名称（兼容旧数据，显示用）
  tags: string[];
  estimatedMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

const KEY = "study-planner:tasks";

function readAll(): Task[] {
  if (typeof window === "undefined") return toTasks(mockTasks);
  try {
    const raw = userStorage.getItem(KEY);
    if (!raw) return toTasks(mockTasks);
    return JSON.parse(raw) as Task[];
  } catch {
    return toTasks(mockTasks);
  }
}

/** 把 mock 任务（无 createdAt/updatedAt）转成完整 Task */
function toTasks(
  mocks: Array<{
    id: string;
    title: string;
    description?: string;
    priority: Priority;
    status: Status;
    dueDate?: string;
    category: string;
    tags: string[];
  }>,
): Task[] {
  const now = new Date().toISOString();
  return mocks.map((m) => ({
    ...m,
    createdAt: now,
    updatedAt: now,
  }));
}

function writeAll(list: Task[]): void {
  if (typeof window === "undefined") return;
  userStorage.setItem(KEY, JSON.stringify(list));
  notifyDataChanged();
}

export function getTasks(): Task[] {
  return readAll();
}

/** 覆盖式写入整个任务列表（用于导入备份） */
export function setTasks(tasks: Task[]): void {
  writeAll(tasks);
}

export function getTaskById(id: string): Task | null {
  return readAll().find((t) => t.id === id) ?? null;
}

export function addTask(
  task: Omit<Task, "id" | "createdAt" | "updatedAt">,
): Task {
  const now = new Date().toISOString();
  const newTask: Task = {
    ...task,
    id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  writeAll([...readAll(), newTask]);
  return newTask;
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const list = readAll();
  const idx = list.findIndex((t) => t.id === id);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    writeAll(list);
  }
}

export function removeTask(id: string): void {
  writeAll(readAll().filter((t) => t.id !== id));
}

/** 批量更新状态（用于批量操作） */
export function updateTasksStatus(ids: string[], status: Status): void {
  const list = readAll();
  for (const id of ids) {
    const idx = list.findIndex((t) => t.id === id);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        status,
        updatedAt: new Date().toISOString(),
      };
    }
  }
  writeAll(list);
}

/** 批量删除 */
export function removeTasks(ids: string[]): void {
  const set = new Set(ids);
  writeAll(readAll().filter((t) => !set.has(t.id)));
}

export function generateTaskId(): string {
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
