/**
 * AI 排程配置持久化
 *
 * 存 localStorage（仅本机使用，API key 不会上传任何服务器）
 */

const KEY = "study-planner:ai-config";

export type AiProviderName = "openai" | "deepseek" | "moonshot" | "ollama" | "custom";

export interface AiConfig {
  provider: AiProviderName;
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  provider: "deepseek",
  baseUrl: "https://api.deepseek.com/v1",
  apiKey: "",
  model: "deepseek-chat",
  temperature: 0.3,
  maxTokens: 2048,
};

export function getAiConfig(): AiConfig {
  if (typeof window === "undefined") return DEFAULT_AI_CONFIG;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw) as Partial<AiConfig>;
    return { ...DEFAULT_AI_CONFIG, ...parsed };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAiConfig(config: AiConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(config));
  window.dispatchEvent(new Event("study-planner:data-changed"));
}

export function clearAiConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("study-planner:data-changed"));
}
