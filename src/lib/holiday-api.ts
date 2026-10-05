/**
 * 在线节假日 API 接入（timor.tech）
 *
 * 免费、免 key、CORS 友好
 * 文档：https://timor.tech/api/holiday/
 *
 * 数据范围：当前年 + 次年（用户日历实际用到的范围）
 * 数据更新：API 服务方不定期更新（一般跟随国务院办公厅发文）
 *
 * 缓存策略：拉取成功后写入 localStorage，下次优先用缓存，过期（>24h）自动重新拉取
 */

export type DayStatusType = "workday" | "holiday" | "rest" | "weekend";

export interface ApiCalendarEntry {
  date: string; // "yyyy-MM-dd"
  type: DayStatusType;
  name: string;
  source: "api";
}

interface TimorHolidayItem {
  holiday: boolean;
  name: string;
  wage: number;
  date: string;
  rest?: number;
  target?: string;
  after?: boolean;
}

interface TimorYearResponse {
  code: number;
  holiday: Record<string, TimorHolidayItem>;
}

const API_BASE = "https://timor.tech/api/holiday/year";
const CACHE_KEY = "study-planner:holiday-api-cache";
const SETTING_KEY = "study-planner:holiday-source"; // "local" | "api"
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时

// ==================== 数据源切换 ====================

export type HolidaySource = "local" | "api";

export function getHolidaySource(): HolidaySource {
  if (typeof window === "undefined") return "local";
  const v = localStorage.getItem(SETTING_KEY);
  return v === "api" ? "api" : "local";
}

export function setHolidaySource(src: HolidaySource): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTING_KEY, src);
}

// ==================== 缓存 ====================

interface CachePayload {
  fetchedAt: number; // ms timestamp
  entries: ApiCalendarEntry[];
}

function readCache(): CachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachePayload;
  } catch {
    return null;
  }
}

function writeCache(payload: CachePayload): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export function clearCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}

export function getCacheInfo(): {
  hasCache: boolean;
  count: number;
  fetchedAt: number | null;
  ageMs: number | null;
  expired: boolean;
} {
  const c = readCache();
  if (!c) {
    return {
      hasCache: false,
      count: 0,
      fetchedAt: null,
      ageMs: null,
      expired: true,
    };
  }
  const ageMs = Date.now() - c.fetchedAt;
  return {
    hasCache: true,
    count: c.entries.length,
    fetchedAt: c.fetchedAt,
    ageMs,
    expired: ageMs > CACHE_TTL_MS,
  };
}

// ==================== API 拉取 ====================

async function fetchYear(year: number): Promise<TimorHolidayItem[]> {
  const res = await fetch(`${API_BASE}/${year}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`API 返回 ${res.status}`);
  }
  const data = (await res.json()) as TimorYearResponse;
  if (data.code !== 0 || !data.holiday) {
    throw new Error("API 数据格式异常");
  }
  return Object.values(data.holiday);
}

/**
 * 拉取当前年 + 次年所有节假日/调休条目
 * - 网络失败时，如果有过期缓存仍使用并打 warning
 * - 完全无数据时抛错
 */
export async function fetchHolidayCalendar(
  force = false,
): Promise<ApiCalendarEntry[]> {
  // 命中未过期缓存直接返回
  if (!force) {
    const info = getCacheInfo();
    if (info.hasCache && !info.expired) {
      return readCache()!.entries;
    }
  }

  const now = new Date();
  const years = [now.getFullYear(), now.getFullYear() + 1];

  try {
    const allItems: TimorHolidayItem[] = [];
    for (const y of years) {
      const items = await fetchYear(y);
      allItems.push(...items);
    }
    const entries: ApiCalendarEntry[] = allItems.map((item) => ({
      date: item.date,
      type: item.holiday ? "holiday" : "workday",
      name: item.name,
      source: "api",
    }));
    writeCache({ fetchedAt: Date.now(), entries });
    return entries;
  } catch (err) {
    // 网络失败：兜底用过期缓存
    const cached = readCache();
    if (cached) {
      console.warn(
        "[HolidayAPI] 拉取失败，使用过期缓存：",
        (err as Error).message,
      );
      return cached.entries;
    }
    throw err;
  }
}

/** 获取当前缓存的日历条目（不发起网络请求） */
export function getCachedHolidayCalendar(): ApiCalendarEntry[] {
  const c = readCache();
  return c?.entries ?? [];
}
