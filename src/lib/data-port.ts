/**
 * 数据导出/导入工具
 *
 * 导出：把 localStorage 中所有学习日程数据打包为 JSON 文件下载
 * 导入：从 JSON 文件读取并覆盖写入（需二次确认）
 *
 * 文件命名格式：study-planner-backup-YYYY-MM-DD.json
 *
 * 数据范围：
 * - tasks / time_blocks / categories / exams
 * - courses / course_sessions / holidays / period_times
 * - day_notes
 */

import { getTasks, setTasks } from "./tasks";
import {
  getCourses,
  setCourses,
  getSessions,
  setSessions,
  getHolidays,
  setHolidays,
  getPeriodTimes,
  setPeriodTimes,
  type Course,
  type CourseSession,
  type Holiday,
} from "./course-storage";
import { getTimeBlocks, setTimeBlocks, type TimeBlock } from "./time-blocks";
import {
  getCategories,
  setCategories,
  type Category,
} from "./categories";
import { userStorage } from "./user-storage";

export const BACKUP_VERSION = 2;

export interface BackupPayload {
  version: number;
  exportedAt: string; // ISO
  data: {
    tasks: ReturnType<typeof getTasks>;
    timeBlocks: TimeBlock[];
    courses: Course[];
    sessions: CourseSession[];
    holidays: Holiday[];
    periodTimes: ReturnType<typeof getPeriodTimes>;
    categories: Category[];
  };
}

/** 收集所有数据 */
export function exportAllData(): BackupPayload {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      tasks: getTasks(),
      timeBlocks: getTimeBlocks(),
      courses: getCourses(),
      sessions: getSessions(),
      holidays: getHolidays(),
      periodTimes: getPeriodTimes(),
      categories: getCategories(),
    },
  };
}

/** 触发浏览器下载 */
export function downloadBackup(): void {
  const payload = exportAllData();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study-planner-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 验证备份文件结构 */
export function validateBackup(raw: unknown): BackupPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("文件格式无效");
  }
  const obj = raw as Partial<BackupPayload>;
  if (typeof obj.version !== "number") {
    throw new Error("缺少版本号");
  }
  if (!obj.data || typeof obj.data !== "object") {
    throw new Error("缺少数据");
  }
  // 检查关键字段是否为数组
  const d = obj.data;
  const arrayFields = ["tasks", "timeBlocks", "courses", "sessions", "holidays"];
  for (const f of arrayFields) {
    if (!Array.isArray((d as Record<string, unknown>)[f])) {
      throw new Error(`字段 ${f} 应为数组`);
    }
  }
  return obj as BackupPayload;
}

/** 覆盖式导入所有数据 */
export function importAllData(payload: BackupPayload): void {
  setTasks(payload.data.tasks);
  setTimeBlocks(payload.data.timeBlocks);
  setCourses(payload.data.courses);
  setSessions(payload.data.sessions);
  setHolidays(payload.data.holidays);
  setPeriodTimes(payload.data.periodTimes);
  // v1 备份可能不含 categories，缺失则用当前分类
  if (payload.data.categories) {
    setCategories(payload.data.categories);
  }
}

// 所有数据持久化的 base localStorage key（清空数据用）
// 实际存储时会按 userId 隔离（在 user-storage.ts 里加后缀）
export const STORAGE_KEYS = [
  "study-planner:tasks",
  "study-planner:time-blocks",
  "study-planner:courses",
  "study-planner:course-sessions",
  "study-planner:holidays",
  "study-planner:period-times",
  "study-planner:day-notes",
  "study-planner:categories",
] as const;

/**
 * 清空当前用户的所有数据（恢复首次启动的种子状态）
 * - 清除当前用户的 8 个 localStorage key
 * - 触发 storage 事件让其他打开的标签页同步刷新
 */
export function clearAllData(): void {
  if (typeof window === "undefined") return;
  // 通过 userStorage.removeItem 删除（自动按当前 user 隔离）
  for (const k of STORAGE_KEYS) {
    userStorage.removeItem(k);
  }
  // 通知其他标签页
  window.dispatchEvent(new Event("storage"));
}

/** 文件读取 + 解析 + 校验 */
export async function readBackupFile(file: File): Promise<BackupPayload> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("JSON 解析失败");
  }
  return validateBackup(parsed);
}
