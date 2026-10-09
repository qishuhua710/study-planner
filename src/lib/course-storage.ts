/**
 * 课程表数据层
 * Phase 1：先用 localStorage 持久化（mock）
 * Phase 3：迁移到 Supabase（courses / course_sessions / holidays 三表）
 */

import { userStorage } from "./user-storage";

// ==================== 本地 Mock 数据（避免与 mock-data 形成循环引用）====================

const mockCourses: Course[] = [
  { id: "c1", name: "高等数学", teacher: "张老师", color: "#5C8A6B", startWeek: 1, endWeek: 16 },
  { id: "c2", name: "数字逻辑", teacher: "李老师", color: "#7B8E5C", startWeek: 1, endWeek: 16 },
  { id: "c3", name: "大学英语", teacher: "王老师", color: "#8B7E6B", startWeek: 1, endWeek: 16 },
  { id: "c4", name: "人工智能导论", teacher: "赵老师", color: "#6B8E7B", startWeek: 1, endWeek: 16 },
  { id: "c5", name: "电子技术基础", teacher: "陈老师", color: "#7B8E5C", startWeek: 1, endWeek: 16 },
];

const mockCourseSessions: CourseSession[] = [
  { id: "s1", courseId: "c1", weekday: 1, periodStart: 1, periodEnd: 2, startTime: "08:00", endTime: "09:40", classroom: "A101" },
  { id: "s2", courseId: "c1", weekday: 3, periodStart: 3, periodEnd: 4, startTime: "10:00", endTime: "11:40", classroom: "A101" },
  { id: "s3", courseId: "c2", weekday: 2, periodStart: 1, periodEnd: 2, startTime: "08:00", endTime: "09:40", classroom: "B203" },
  { id: "s4", courseId: "c2", weekday: 4, periodStart: 5, periodEnd: 6, startTime: "14:00", endTime: "15:40", classroom: "B203" },
  { id: "s5", courseId: "c3", weekday: 3, periodStart: 1, periodEnd: 2, startTime: "08:00", endTime: "09:40", classroom: "C305" },
  { id: "s6", courseId: "c4", weekday: 5, periodStart: 3, periodEnd: 4, startTime: "10:00", endTime: "11:40", classroom: "D407" },
  { id: "s7", courseId: "c5", weekday: 4, periodStart: 1, periodEnd: 2, startTime: "08:00", endTime: "09:40", classroom: "E102" },
];

const mockHolidays: Holiday[] = [
  { id: "h1", name: "中秋节", startDate: "2026-09-25", endDate: "2026-09-27", type: "holiday" },
  { id: "h2", name: "国庆节", startDate: "2026-10-01", endDate: "2026-10-07", type: "holiday" },
];

const mockPeriodTimes: PeriodTimes = {
  1: ["08:00", "08:45"],
  2: ["08:55", "09:40"],
  3: ["10:00", "10:45"],
  4: ["10:55", "11:40"],
  5: ["14:00", "14:45"],
  6: ["14:55", "15:40"],
  7: ["16:00", "16:45"],
  8: ["16:55", "17:40"],
  9: ["19:00", "19:45"],
  10: ["19:55", "20:40"],
  11: ["20:50", "21:35"],
  12: ["21:45", "22:30"],
};

/** 课程色预设 */
export const courseColorPresets = [
  { name: "森林绿", value: "#5C8A6B" },
  { name: "橄榄绿", value: "#7B8E5C" },
  { name: "蓝灰绿", value: "#6B8E7B" },
  { name: "暖棕", value: "#8B7E6B" },
  { name: "陶土", value: "#A45C3D" },
  { name: "鼠尾草", value: "#7C8471" },
];

// ==================== 类型定义 ====================

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=周日 ... 6=周六

export interface Course {
  id: string;
  name: string;
  teacher?: string;
  color: string; // 课程色（默认森林绿 #5C8A6B）
  startWeek: number; // 起始周
  endWeek: number; // 结束周
}

export interface CourseSession {
  id: string;
  courseId: string;
  weekday: Weekday;
  periodStart: number; // 第几节开始（1-based）
  periodEnd: number; // 第几节结束
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  classroom?: string;
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string; // "yyyy-MM-dd"
  endDate: string;
  type: "holiday" | "rest";
}

/** 节次时间映射：第几节 → [开始, 结束] */
export type PeriodTimes = Record<number, [string, string]>;

// ==================== 存储键 ====================

const KEYS = {
  courses: "study-planner:courses",
  sessions: "study-planner:course-sessions",
  holidays: "study-planner:holidays",
  periodTimes: "study-planner:period-times",
} as const;

// ==================== 读取（带 fallback 到 mock）====================

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = userStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  userStorage.setItem(key, JSON.stringify(value));
}

// ==================== 课程 CRUD ====================

export function getCourses(): Course[] {
  return read<Course[]>(KEYS.courses, mockCourses);
}

export function setCourses(courses: Course[]): void {
  write(KEYS.courses, courses);
}

export function addCourse(course: Course): void {
  const list = getCourses();
  list.push(course);
  setCourses(list);
}

// ==================== 课时 CRUD ====================

export function getSessions(): CourseSession[] {
  return read<CourseSession[]>(KEYS.sessions, []);
}

export function setSessions(sessions: CourseSession[]): void {
  write(KEYS.sessions, sessions);
}

export function addSessions(sessions: CourseSession[]): void {
  const list = getSessions();
  list.push(...sessions);
  setSessions(list);
}

// 一次性导入：清空旧数据写入新数据
export function replaceAllCourses(
  courses: Course[],
  sessions: CourseSession[],
): void {
  setCourses(courses);
  setSessions(sessions);
}

// ==================== 假期 CRUD ====================

export function getHolidays(): Holiday[] {
  return read<Holiday[]>(KEYS.holidays, mockHolidays);
}

export function setHolidays(holidays: Holiday[]): void {
  write(KEYS.holidays, holidays);
}

export function addHoliday(holiday: Holiday): void {
  const list = getHolidays();
  list.push(holiday);
  setHolidays(list);
}

export function removeHoliday(id: string): void {
  setHolidays(getHolidays().filter((h) => h.id !== id));
}

// ==================== 节次时间 ====================

export function getPeriodTimes(): PeriodTimes {
  return read<PeriodTimes>(KEYS.periodTimes, mockPeriodTimes);
}

export function setPeriodTimes(times: PeriodTimes): void {
  write(KEYS.periodTimes, times);
}

export function resetPeriodTimes(): void {
  write(KEYS.periodTimes, mockPeriodTimes);
}

// ==================== 查询函数 ====================

/** 判断某天是否为假期 */
export function isHoliday(date: Date): Holiday | null {
  const dateStr = formatDate(date);
  return getHolidays().find(
    (h) => dateStr >= h.startDate && dateStr <= h.endDate,
  ) ?? null;
}

/** 获取某天该周次的所有课时 */
export function getCoursesOnDate(date: Date): Array<{
  session: CourseSession;
  course: Course;
}> {
  const weekday = date.getDay() as Weekday;
  // 计算该日期所在的教学周次（9 月 1 日视为第 1 周起点）
  const termStart = new Date(date.getFullYear(), 8, 1); // 9 月 1 日
  const weekNumber = Math.max(
    1,
    Math.floor(
      (date.getTime() - termStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
    ) + 1,
  );

  const sessions = getSessions().filter((s) => s.weekday === weekday);
  const courses = getCourses();
  const results: Array<{ session: CourseSession; course: Course }> = [];

  for (const session of sessions) {
    const course = courses.find((c) => c.id === session.courseId);
    if (!course) continue;
    if (weekNumber < course.startWeek || weekNumber > course.endWeek) continue;
    results.push({ session, course });
  }

  // 按节次排序
  return results.sort((a, b) => a.session.periodStart - b.session.periodStart);
}

/** 判断某天是否有课 */
export function hasClassOnDate(date: Date): boolean {
  return getCoursesOnDate(date).length > 0;
}

/** 计算当前教学周次（以 9 月 1 日为第 1 周） */
export function getCurrentWeekNumber(date: Date = new Date()): number {
  const termStart = new Date(date.getFullYear(), 8, 1);
  return Math.max(
    1,
    Math.floor(
      (date.getTime() - termStart.getTime()) / (7 * 24 * 60 * 60 * 1000),
    ) + 1,
  );
}

// ==================== 工具 ====================

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 节次字符串解析：支持 "3-4" / "3~4" / "3,4" / "3-4, 6" / "第3-4节" / "周一 1-2节" */
export function parsePeriods(input: string): { start: number; end: number }[] {
  // 先剥掉"周X"/"星期X"前缀和"节"后缀
  const cleaned = input
    .replace(/^(周[一二三四五六日]|星期[一二三四五六日天])\s*/, "")
    .replace(/第|节/g, "")
    .replace(/[a-zA-Z]+/g, "") // 去掉英文
    .trim();
  if (!cleaned) return [];
  const result: { start: number; end: number }[] = [];

  for (const part of cleaned.split(/[,，、]/)) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(/^(\d+)\s*[-~到至]\s*(\d+)$/);
    if (m) {
      const a = parseInt(m[1], 10);
      const b = parseInt(m[2], 10);
      if (a > 0 && b >= a) {
        result.push({ start: a, end: b });
        continue;
      }
    }
    const single = trimmed.match(/^(\d+)$/);
    if (single) {
      const n = parseInt(single[1], 10);
      if (n > 0) result.push({ start: n, end: n });
    }
  }

  return result;
}

/** 周次字符串解析：支持 "1-16" / "1~16" / "1-8, 10-16" */
export function parseWeeks(
  input: string,
): { startWeek: number; endWeek: number } {
  const cleaned = input.replace(/第|周/g, "").trim();
  const m = cleaned.match(/^(\d+)\s*[-~到至]\s*(\d+)$/);
  if (m) {
    return { startWeek: parseInt(m[1], 10), endWeek: parseInt(m[2], 10) };
  }
  const single = cleaned.match(/^(\d+)$/);
  if (single) {
    const n = parseInt(single[1], 10);
    return { startWeek: n, endWeek: n };
  }
  // 默认整学期
  return { startWeek: 1, endWeek: 16 };
}

/** 周几字符串解析：支持 "周一" / "星期三" / "1" / "Monday" / "周一 1-2节" / "周一第3节" */
export function parseWeekday(input: string): Weekday | null {
  const cleaned = input.trim();
  // 先尝试提取 "周X" 或 "星期X" 前缀（可能后跟其他字符）
  const weekMatch = cleaned.match(/^(周[一二三四五六日]|星期[一二三四五六日天])/);
  if (weekMatch) {
    const map: Record<string, Weekday> = {
      周日: 0,
      周一: 1,
      周二: 2,
      周三: 3,
      周四: 4,
      周五: 5,
      周六: 6,
      星期天: 0,
      星期一: 1,
      星期二: 2,
      星期三: 3,
      星期四: 4,
      星期五: 5,
      星期六: 6,
    };
    return map[weekMatch[1]] ?? null;
  }
  // 英文星期
  const enMap: Record<string, Weekday> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  if (enMap[cleaned] !== undefined) return enMap[cleaned];
  // 纯数字
  const n = parseInt(cleaned, 10);
  if (!isNaN(n) && n >= 0 && n <= 6) return n as Weekday;
  return null;
}
