/**
 * 中国法定节假日 + 调休日历数据
 *
 * 数据来源：国务院办公厅每年发布的放假通知
 * 数据范围：2025-2026 两年
 * 类型：
 *   - holiday: 法定节假日（放假）
 *   - workday: 调休工作日（原本是周末，因调休变成工作日，如国庆后某周六补班）
 *
 * 用户自配假期和这个分开存（getHolidays() / addHoliday()），互不冲突。
 * 节假日显示优先级：法定节假日 > 调休工作日 > 用户自配假期 > 普通周末
 */

export type DayStatusType = "workday" | "holiday" | "rest" | "weekend";

/** 单日状态条目 */
export interface CalendarDayStatus {
  date: string; // "yyyy-MM-dd"
  type: DayStatusType;
  name?: string; // 节日名（如"国庆节"）或"调休上班"
}

/** 2025-2026 法定节假日 + 调休 */
export const cnCalendar2025_2026: CalendarDayStatus[] = [
  // ===== 2025 =====
  // 元旦：1月1日放假，共1天，无调休
  { date: "2025-01-01", type: "holiday", name: "元旦" },

  // 春节：1月28日（农历除夕）至2月4日放假调休，共8天
  // 1月26日（周日）、2月8日（周六）上班
  { date: "2025-01-26", type: "workday", name: "春节调休上班" },
  { date: "2025-01-28", type: "holiday", name: "春节" },
  { date: "2025-01-29", type: "holiday", name: "春节" },
  { date: "2025-01-30", type: "holiday", name: "春节" },
  { date: "2025-01-31", type: "holiday", name: "春节" },
  { date: "2025-02-01", type: "holiday", name: "春节" },
  { date: "2025-02-02", type: "holiday", name: "春节" },
  { date: "2025-02-03", type: "holiday", name: "春节" },
  { date: "2025-02-04", type: "holiday", name: "春节" },
  { date: "2025-02-08", type: "workday", name: "春节调休上班" },

  // 清明：4月4日至6日放假，共3天，无调休
  { date: "2025-04-04", type: "holiday", name: "清明节" },
  { date: "2025-04-05", type: "holiday", name: "清明节" },
  { date: "2025-04-06", type: "holiday", name: "清明节" },

  // 劳动节：5月1日至5日放假调休，共5天
  // 4月27日（周日）上班
  { date: "2025-04-27", type: "workday", name: "劳动节调休上班" },
  { date: "2025-05-01", type: "holiday", name: "劳动节" },
  { date: "2025-05-02", type: "holiday", name: "劳动节" },
  { date: "2025-05-03", type: "holiday", name: "劳动节" },
  { date: "2025-05-04", type: "holiday", name: "劳动节" },
  { date: "2025-05-05", type: "holiday", name: "劳动节" },

  // 端午：5月31日至6月2日放假，共3天，无调休
  { date: "2025-05-31", type: "holiday", name: "端午节" },
  { date: "2025-06-01", type: "holiday", name: "端午节" },
  { date: "2025-06-02", type: "holiday", name: "端午节" },

  // 国庆+中秋：10月1日至8日放假调休，共8天
  // 9月28日（周日）、10月11日（周六）上班
  { date: "2025-09-28", type: "workday", name: "国庆调休上班" },
  { date: "2025-10-01", type: "holiday", name: "国庆节" },
  { date: "2025-10-02", type: "holiday", name: "国庆节" },
  { date: "2025-10-03", type: "holiday", name: "国庆节" },
  { date: "2025-10-04", type: "holiday", name: "国庆节" },
  { date: "2025-10-05", type: "holiday", name: "国庆节" },
  { date: "2025-10-06", type: "holiday", name: "国庆节" },
  { date: "2025-10-07", type: "holiday", name: "国庆节" },
  { date: "2025-10-08", type: "holiday", name: "中秋节" },
  { date: "2025-10-11", type: "workday", name: "国庆调休上班" },

  // ===== 2026 =====
  // 元旦：1月1日至3日放假调休，共3天
  // 1月4日（周日）上班
  { date: "2026-01-01", type: "holiday", name: "元旦" },
  { date: "2026-01-02", type: "holiday", name: "元旦" },
  { date: "2026-01-03", type: "holiday", name: "元旦" },
  { date: "2026-01-04", type: "workday", name: "元旦调休上班" },

  // 春节：2月17日（农历除夕）至2月23日放假调休，共7天
  // 2月14日（周六）、2月28日（周六）上班
  { date: "2026-02-14", type: "workday", name: "春节调休上班" },
  { date: "2026-02-17", type: "holiday", name: "春节" },
  { date: "2026-02-18", type: "holiday", name: "春节" },
  { date: "2026-02-19", type: "holiday", name: "春节" },
  { date: "2026-02-20", type: "holiday", name: "春节" },
  { date: "2026-02-21", type: "holiday", name: "春节" },
  { date: "2026-02-22", type: "holiday", name: "春节" },
  { date: "2026-02-23", type: "holiday", name: "春节" },
  { date: "2026-02-28", type: "workday", name: "春节调休上班" },

  // 清明：4月4日至6日放假，共3天，无调休
  { date: "2026-04-04", type: "holiday", name: "清明节" },
  { date: "2026-04-05", type: "holiday", name: "清明节" },
  { date: "2026-04-06", type: "holiday", name: "清明节" },

  // 劳动节：5月1日至3日放假，共3天，无调休
  { date: "2026-05-01", type: "holiday", name: "劳动节" },
  { date: "2026-05-02", type: "holiday", name: "劳动节" },
  { date: "2026-05-03", type: "holiday", name: "劳动节" },

  // 端午：6月19日至21日放假调休，共3天
  // 6月20日（周六）原本就是周末，无需调休
  { date: "2026-06-19", type: "holiday", name: "端午节" },
  { date: "2026-06-20", type: "holiday", name: "端午节" },
  { date: "2026-06-21", type: "holiday", name: "端午节" },

  // 中秋：9月25日至27日放假调休，共3天
  // 9月27日（周日）原本就是周末
  { date: "2026-09-25", type: "holiday", name: "中秋节" },
  { date: "2026-09-26", type: "holiday", name: "中秋节" },
  { date: "2026-09-27", type: "holiday", name: "中秋节" },

  // 国庆：10月1日至7日放假调休，共7天
  // 9月27日（周日）上班（与中秋连休调整）
  // 10月10日（周六）上班
  { date: "2026-09-27", type: "workday", name: "国庆调休上班" },
  { date: "2026-10-01", type: "holiday", name: "国庆节" },
  { date: "2026-10-02", type: "holiday", name: "国庆节" },
  { date: "2026-10-03", type: "holiday", name: "国庆节" },
  { date: "2026-10-04", type: "holiday", name: "国庆节" },
  { date: "2026-10-05", type: "holiday", name: "国庆节" },
  { date: "2026-10-06", type: "holiday", name: "国庆节" },
  { date: "2026-10-07", type: "holiday", name: "国庆节" },
  { date: "2026-10-10", type: "workday", name: "国庆调休上班" },
];

// ===== 按日期查找 =====
const statusMap = new Map<string, CalendarDayStatus>();
for (const s of cnCalendar2025_2026) {
  statusMap.set(s.date, s);
}

/**
 * 获取某一天的状态
 * 优先级：
 *   1. 法定节假日/调休（来自 cnCalendar2025_2026）
 *   2. 普通周末（周六/周日）
 *   3. 普通工作日（周一至周五，且不在调休表中）
 */
export function getDayStatus(date: Date): CalendarDayStatus {
  const dateStr = formatDate(date);

  // 1. 优先匹配国务院节假日/调休
  const official = statusMap.get(dateStr);
  if (official) return official;

  // 2. 普通周末
  const day = date.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) {
    return { date: dateStr, type: "weekend" };
  }

  // 3. 默认工作日
  return { date: dateStr, type: "workday" };
}

/** 简化：是否休息日（含法定假 + 周末，不含调休工作日） */
export function isRestDay(date: Date): boolean {
  const s = getDayStatus(date);
  return s.type === "holiday" || s.type === "weekend";
}

/** 是否法定节假日 */
export function isOfficialHoliday(date: Date): boolean {
  return getDayStatus(date).type === "holiday";
}

/** 是否调休工作日 */
export function isMakeupWorkday(date: Date): boolean {
  return getDayStatus(date).type === "workday" && !!getDayStatus(date).name;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 用户自配假期和法定节假日合并显示
 * 用户假期 type 固定为 "holiday"+"rest"
 */
export interface MergedDayStatus extends CalendarDayStatus {
  source: "official" | "user" | "auto" | "api"; // 来源
}

/** 获取合并后某天的状态（法定优先 + 用户假期补充 + 自动判定周末/工作日） */
export function getMergedDayStatus(
  date: Date,
  userHolidays: Array<{ startDate: string; endDate: string; name: string }>,
  apiEntries?: Array<{ date: string; type: DayStatusType; name: string }>,
): MergedDayStatus {
  const dateStr = formatDate(date);

  // 1. 用户假期覆盖（优先级最高）
  for (const h of userHolidays) {
    if (dateStr >= h.startDate && dateStr <= h.endDate) {
      return {
        date: dateStr,
        type: "holiday",
        name: h.name,
        source: "user",
      };
    }
  }

  // 2. 在线 API 数据（如果提供）
  if (apiEntries) {
    const apiItem = apiEntries.find((e) => e.date === dateStr);
    if (apiItem) {
      return {
        date: dateStr,
        type: apiItem.type,
        name: apiItem.name,
        source: "api",
      };
    }
  }

  // 3. 本地内置数据
  const s = getDayStatus(date);
  return { ...s, source: "official" };
}
