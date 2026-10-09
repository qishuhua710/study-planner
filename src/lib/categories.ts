/**
 * 分类数据层
 * Phase 1：localStorage 持久化
 * Phase 3：迁移到 Supabase categories 表
 *
 * 每个用户自建分类（如"数学"、"英语"、"项目代码"），可带颜色用于视觉区分
 */

import { userStorage } from "./user-storage";

export interface Category {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

const KEY = "study-planner:categories";

/** 分类色预设（与课程色系协调） */
export const categoryColorPresets = [
  { name: "森林绿", value: "#5C8A6B" },
  { name: "橄榄绿", value: "#7B8E5C" },
  { name: "蓝灰绿", value: "#6B8E7B" },
  { name: "暖棕", value: "#8B7E6B" },
  { name: "陶土", value: "#A45C3D" },
  { name: "鼠尾草", value: "#7C8471" },
  { name: "深蓝", value: "#3F5973" },
  { name: "暗红", value: "#8B4A3A" },
];

/** 初始种子分类（首次启动 fallback） */
const seedCategories: Category[] = [
  { id: "cat-seed-1", name: "数学", color: "#5C8A6B", createdAt: new Date().toISOString() },
  { id: "cat-seed-2", name: "英语", color: "#8B7E6B", createdAt: new Date().toISOString() },
  { id: "cat-seed-3", name: "电子技术", color: "#7B8E5C", createdAt: new Date().toISOString() },
  { id: "cat-seed-4", name: "人工智能", color: "#6B8E7B", createdAt: new Date().toISOString() },
];

function readAll(): Category[] {
  if (typeof window === "undefined") return seedCategories;
  try {
    const raw = userStorage.getItem(KEY);
    if (!raw) return seedCategories;
    return JSON.parse(raw) as Category[];
  } catch {
    return seedCategories;
  }
}

function writeAll(list: Category[]): void {
  if (typeof window === "undefined") return;
  userStorage.setItem(KEY, JSON.stringify(list));
}

export function getCategories(): Category[] {
  return readAll();
}

export function getCategoryById(id: string): Category | null {
  return readAll().find((c) => c.id === id) ?? null;
}

/** 按 name 查找（兼容旧任务用字符串做 category 的情况） */
export function getCategoryByName(name: string): Category | null {
  if (!name) return null;
  return readAll().find((c) => c.name === name) ?? null;
}

export function addCategory(name: string, color: string): Category {
  const newCat: Category = {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim(),
    color,
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), newCat]);
  return newCat;
}

export function updateCategory(id: string, updates: Partial<Category>): void {
  const list = readAll();
  const idx = list.findIndex((c) => c.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...updates };
    writeAll(list);
  }
}

export function removeCategory(id: string): void {
  writeAll(readAll().filter((c) => c.id !== id));
}

/** 覆盖式写入（用于导入备份） */
export function setCategories(cats: Category[]): void {
  writeAll(cats);
}

export function generateCategoryId(): string {
  return `cat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
