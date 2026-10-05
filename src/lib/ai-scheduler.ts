/**
 * AI 智能排程接口规范（Phase 3 占位）
 *
 * 当前项目自带的 scheduler.ts（基于优先级 + 空闲时段填充分配）已能覆盖大部分场景。
 * 这里预留 AI 排程的 type / prompt 模板 / 适配器接口，便于未来接入 LLM 时不破坏现有调用。
 *
 * 设计原则：
 * 1. 同样的输入（AiScheduleRequest）→ 同样的输出（AiScheduleResult）
 * 2. 多个 provider 适配器（openai / ollama / mock）共享同一接口
 * 3. 业务代码不直接调 provider，而是调 runAiSchedule()，由它选择 provider
 *
 * 未来接入步骤（参考）：
 * 1. 选 provider，在 settings 页加 API key 配置
 * 2. 实现 provider 适配器（callProvider 函数）
 * 3. runAiSchedule() 把 AiScheduleRequest 转成 prompt + 调 provider + 解析回 AiScheduleResult
 * 4. UI：智能排程按钮加 "用 AI 重新规划" 入口，调用 runAiSchedule 替代默认 scheduler
 */

import type { Task } from "./tasks";
import type { CourseSession } from "./course-storage";
import type { TimeBlock } from "./time-blocks";

// ====== 通用输入/输出类型 ======

/**
 * AI 排程请求：包含所有上下文
 * - tasks: 待安排的任务（含 priority / status / estimatedMinutes）
 * - sessions: 课程时段（已硬约束）
 * - existingBlocks: 已有时间块
 * - periodTimes: 节次时段
 * - date: 目标日期
 * - preferences: 用户偏好（可选）
 */
export interface AiScheduleRequest {
  date: string; // yyyy-MM-dd
  tasks: Task[];
  sessions: CourseSession[];
  existingBlocks: TimeBlock[];
  periodTimes: Record<number, [string, string]>;
  preferences?: {
    /** 单次专注时长上限（分钟） */
    maxBlockMinutes?: number;
    /** 偏好时段：上午 / 下午 / 晚上 / 任意 */
    preferredTimeOfDay?: "morning" | "afternoon" | "evening" | "any";
    /** 是否为高优任务保留最长连续时段 */
    preserveLongestForHighPriority?: boolean;
    /** 难度高的任务是否放早上（精力最好时） */
    hardTasksInMorning?: boolean;
  };
}

/**
 * AI 排程结果：与本地 suggestSchedule 返回类型保持一致
 */
export interface AiScheduleResult {
  blocks: AiScheduledBlock[];
  /** AI 给出的解释（让用户知道为什么这么排） */
  reasoning?: string;
  /** 原始 LLM 响应，便于调试 */
  rawResponse?: unknown;
}

export interface AiScheduledBlock {
  taskId?: string;
  taskTitle: string;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  /** AI 给出的优先级（1-5），用于显示 */
  priority?: number;
  /** AI 的简短说明 */
  rationale?: string;
}

// ====== Provider 适配器接口 ======

export interface AiProvider {
  /** Provider 标识符 */
  readonly name: "openai" | "ollama" | "mock" | "custom";
  /** 是否需要 API key */
  readonly requiresApiKey: boolean;
  /** Provider 完整名称（用于 UI 显示） */
  readonly displayName: string;
  /** 实际调用 LLM */
  callProvider(
    request: AiScheduleRequest,
    config: AiProviderConfig,
  ): Promise<AiScheduleResult>;
}

export interface AiProviderConfig {
  apiKey?: string;
  baseUrl?: string; // e.g. "https://api.openai.com/v1"
  model?: string; // e.g. "gpt-4o-mini", "qwen2.5:7b"
  temperature?: number;
  maxTokens?: number;
}

// ====== Prompt 模板 ======

/**
 * 系统提示词（中文版，给 AI 看的）
 * 包含规则、JSON 输出格式、风格要求
 */
export const AI_SCHEDULE_SYSTEM_PROMPT = `你是一个学习时间规划助手。你的任务是根据用户当天未完成的任务和已有日程，给出最优的时间块安排。

【规则】
1. 只能把任务安排在课程的空闲时段内
2. 每个时间块不超过用户偏好的 maxBlockMinutes
3. 高优任务优先分配给最长的连续空闲时段
5. JSON 格式输出，不要任何额外说明

【输出格式】（严格 JSON，不要 markdown）
{
  "blocks": [
    {"taskTitle": "...", "taskId": "...", "startTime": "HH:mm", "endTime": "HH:mm", "rationale": "为什么排在这里"}
  ],
  "reasoning": "整体规划思路"
}`;

/**
 * 构造用户提示词（上下文 + 任务 + 空闲时段）
 */
export function buildUserPrompt(req: AiScheduleRequest): string {
  const { date, tasks, sessions, existingBlocks, periodTimes, preferences } = req;

  // 计算空闲时段
  const freeSlots = computeFreeSlots(date, sessions, existingBlocks, periodTimes);

  return `【日期】${date}

【待安排任务】
${tasks
  .filter((t) => t.status !== "done")
  .map(
    (t, i) =>
      `${i + 1}. [${t.priority}] ${t.title}` +
      (t.dueDate ? ` (截止: ${t.dueDate})` : "") +
      (t.description ? ` — ${t.description}` : ""),
  )
  .join("\n")}

【当天空闲时段】
${
  freeSlots.length === 0
    ? "（当天没有空闲时段）"
    : freeSlots.map((s) => `${s.start} - ${s.end}（${s.duration} 分钟）`).join("\n")
}

【偏好】
- 单次最长: ${preferences?.maxBlockMinutes ?? 60} 分钟
- 偏好时段: ${preferences?.preferredTimeOfDay ?? "any"}
- 高难任务放早上: ${preferences?.hardTasksInMorning ?? true}

请输出 JSON：`;
}

/**
 * 计算空闲时段（与 scheduler.ts 类似逻辑）
 * 公开以便 AI 适配器复用
 */
export function computeFreeSlots(
  date: string,
  sessions: CourseSession[],
  existingBlocks: TimeBlock[],
  periodTimes: Record<number, [string, string]>,
): { start: string; end: string; duration: number }[] {
  // 把当天所有"占用"的时间段收集起来
  const busy: [string, string][] = [];

  // 课程时段
  const weekday = new Date(date).getDay();
  sessions
    .filter((s) => s.weekday === weekday)
    .forEach((s) => {
      const start = periodTimes[s.periodStart]?.[0];
      const end = periodTimes[s.periodEnd]?.[1];
      if (start && end) busy.push([start, end]);
    });

  // 已有时间块
  existingBlocks
    .filter((b) => b.startTime.startsWith(date))
    .forEach((b) => {
      const s = b.startTime.split(" ")[1]?.slice(0, 5);
      const e = b.endTime.split(" ")[1]?.slice(0, 5);
      if (s && e) busy.push([s, e]);
    });

  busy.sort((a, b) => a[0].localeCompare(b[0]));

  // 计算反向空闲段（默认活动 08:00 - 22:00）
  const FREE_START = "08:00";
  const FREE_END = "22:00";
  const result: { start: string; end: string; duration: number }[] = [];

  let cursor = FREE_START;
  for (const [bStart, bEnd] of busy) {
    if (bStart > cursor) {
      const dur = toMinutes(bStart) - toMinutes(cursor);
      if (dur >= 15) result.push({ start: cursor, end: bStart, duration: dur });
    }
    if (bEnd > cursor) cursor = bEnd;
  }
  if (cursor < FREE_END) {
    const dur = toMinutes(FREE_END) - toMinutes(cursor);
    if (dur >= 15) result.push({ start: cursor, end: FREE_END, duration: dur });
  }
  return result;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ====== Provider 注册表（未来接入） ======

const providers = new Map<string, AiProvider>();

export function registerAiProvider(provider: AiProvider) {
  providers.set(provider.name, provider);
}

export function getAiProvider(name: string): AiProvider | undefined {
  return providers.get(name);
}

export function listAiProviders(): AiProvider[] {
  return Array.from(providers.values());
}

/**
 * 主入口：从设置/偏好读 config → 选 provider → 调用
 *
 * 内部默认注册了：
 * - mock：本地规则（无 AI 时的回退）
 * - openai：占位名，实际由 createOpenAIProvider("openai"|"deepseek"|...) 动态创建并以 "openai" 名注册
 */
export async function runAiSchedule(
  request: AiScheduleRequest,
  config: AiProviderConfig & { providerName?: string } = {},
): Promise<AiScheduleResult> {
  const providerName = config.providerName ?? "mock";
  // openai 兼容服务都以 "openai" 名注册到 providers Map
  const lookup = providerName === "mock" ? "mock" : "openai";
  const provider = getAiProvider(lookup);
  if (!provider) {
    throw new Error(
      `AI 排程 provider "${providerName}" 未注册。请检查代码或调用 registerAiProvider() 注册。`,
    );
  }
  return provider.callProvider(request, config);
}

/**
 * Mock provider：把请求转给本地 scheduler
 * 作为默认 fallback，未来即使 AI 没接入也能用
 */
export const mockAiProvider: AiProvider = {
  name: "mock",
  requiresApiKey: false,
  displayName: "本地规则排程（默认）",
  async callProvider(request, _config) {
    // 委托本地 scheduler 跑规则排程
    const { suggestSchedule } = await import("./scheduler");
    const blocks = suggestSchedule(
      new Date(request.date),
      request.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        status: t.status,
        estimatedMinutes: 30,
      })),
    );
    return {
      blocks: blocks.map((b) => ({
        taskTitle: b.taskTitle,
        startTime: b.startTime,
        endTime: b.endTime,
        rationale: `${b.duration}分钟`,
      })),
      reasoning: "使用本地规则排程（基于优先级 + 空闲时段）",
    };
  },
};

// 自动注册 mock 作为 fallback
registerAiProvider(mockAiProvider);