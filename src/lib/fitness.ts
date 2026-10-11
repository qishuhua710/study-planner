/**
 * 健身数据层
 * 存储在 userStorage（按登录用户隔离，登录后自动云同步到 Supabase user_data 表）
 *
 * 数据结构（单 key JSON）：
 * - exercises: 自定义动作库
 * - records: 训练打卡记录
 */

import { format, startOfWeek, endOfWeek } from "date-fns";
import { userStorage, notifyDataChanged } from "./user-storage";

export interface FitnessExercise {
  id: string;
  name: string;
}

export interface FitnessRecord {
  id: string;
  date: string; // "yyyy-MM-dd"
  exerciseId: string;
  exerciseName: string; // 冗余存名字：动作删除后历史记录仍可读
  sets?: number; // 组数
  reps?: number; // 每组次数
  minutes?: number; // 时长（分钟，适合有氧 / 平板支撑类）
  note?: string;
  createdAt: string;
}

interface FitnessData {
  exercises: FitnessExercise[];
  records: FitnessRecord[];
}

const KEY = "study-planner:fitness-data";

export const DEFAULT_EXERCISES: FitnessExercise[] = [
  { id: "fe-pushup", name: "俯卧撑" },
  { id: "fe-squat", name: "深蹲" },
  { id: "fe-plank", name: "平板支撑" },
  { id: "fe-situp", name: "卷腹" },
  { id: "fe-pullup", name: "引体向上" },
  { id: "fe-run", name: "跑步" },
  { id: "fe-rope", name: "跳绳" },
];

function readData(): FitnessData {
  if (typeof window === "undefined")
    return { exercises: DEFAULT_EXERCISES, records: [] };
  try {
    const raw = userStorage.getItem(KEY);
    if (!raw) return { exercises: DEFAULT_EXERCISES, records: [] };
    const parsed = JSON.parse(raw) as Partial<FitnessData>;
    return {
      exercises: Array.isArray(parsed.exercises)
        ? parsed.exercises
        : DEFAULT_EXERCISES,
      records: Array.isArray(parsed.records) ? parsed.records : [],
    };
  } catch {
    return { exercises: DEFAULT_EXERCISES, records: [] };
  }
}

function writeData(data: FitnessData): void {
  if (typeof window === "undefined") return;
  userStorage.setItem(KEY, JSON.stringify(data));
  notifyDataChanged();
}

export function getFitnessExercises(): FitnessExercise[] {
  return readData().exercises;
}

export function getFitnessRecords(): FitnessRecord[] {
  return readData().records;
}

/** 新增动作（重名忽略） */
export function addFitnessExercise(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const data = readData();
  if (data.exercises.some((e) => e.name === trimmed)) {
    notifyDataChanged();
    return;
  }
  writeData({
    ...data,
    exercises: [
      ...data.exercises,
      { id: `fe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: trimmed },
    ],
  });
}

/** 删除动作（历史记录保留，exerciseName 已冗余） */
export function removeFitnessExercise(id: string): void {
  const data = readData();
  writeData({
    ...data,
    exercises: data.exercises.filter((e) => e.id !== id),
  });
}

export function addFitnessRecord(
  rec: Omit<FitnessRecord, "id" | "createdAt">,
): void {
  const data = readData();
  writeData({
    ...data,
    records: [
      ...data.records,
      {
        ...rec,
        id: `fr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      },
    ],
  });
}

export function removeFitnessRecord(id: string): void {
  const data = readData();
  writeData({ ...data, records: data.records.filter((r) => r.id !== id) });
}

/** 覆盖式写入整个健身数据（用于导入备份） */
export function setFitnessData(data: {
  exercises?: FitnessExercise[];
  records?: FitnessRecord[];
}): void {
  writeData({
    exercises: data.exercises ?? DEFAULT_EXERCISES,
    records: data.records ?? [],
  });
}

/** 本周（周一起）的打卡记录 */
export function getWeekRecords(reference: Date = new Date()): FitnessRecord[] {
  const start = format(
    startOfWeek(reference, { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
  const end = format(endOfWeek(reference, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return readData().records.filter((r) => r.date >= start && r.date <= end);
}

/** 今天的日期 key */
export function fitnessTodayKey(): string {
  return format(new Date(), "yyyy-MM-dd");
}
