/**
 * OpenAI 兼容 Provider（支持 OpenAI / DeepSeek / 通义千问 / Ollama / vLLM 等）
 *
 * 实现要点：
 * 1. 直接从浏览器调用 LLM API（避免中转服务器泄露 API key）
 * 2. 标准 Chat Completions 接口：POST {baseUrl}/chat/completions
 * 3. 强制 JSON 输出（response_format 或 prompt 约束）
 * 4. 解析失败时降级到 mock，不阻塞 UI
 *
 * 注意：浏览器直接调 LLM 需要对方支持 CORS。
 * 推荐：DeepSeek（https://api.deepseek.com）、Ollama 本地、OpenRouter。
 */

import type {
  AiProvider,
  AiProviderConfig,
  AiScheduleRequest,
  AiScheduleResult,
} from "./ai-scheduler";
import { AI_SCHEDULE_SYSTEM_PROMPT, buildUserPrompt } from "./ai-scheduler";

/**
 * 默认 base URLs（按 provider name 自动填）
 */
const DEFAULT_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  moonshot: "https://api.moonshot.cn/v1",
  ollama: "http://localhost:11434/v1",
  custom: "",
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  deepseek: "deepseek-chat",
  moonshot: "moonshot-v1-8k",
  ollama: "llama3.1",
  custom: "gpt-3.5-turbo",
};

/**
 * 安全：解析 LLM 返回的文本，提取 JSON 块
 * 有些 LLM 会包 ```json ... ``` 或加额外说明，做最大兼容
 */
function extractJson(text: string): unknown {
  // 1) 尝试直接 parse
  try {
    return JSON.parse(text);
  } catch {
    /* ignore */
  }
  // 2) 提取 ```json ... ``` 块
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    try {
      return JSON.parse(codeBlock[1].trim());
    } catch {
      /* ignore */
    }
  }
  // 3) 提取首个 {...} 块（贪婪到首个 }）
  const firstBrace = text.indexOf("{");
  if (firstBrace >= 0) {
    // 简单做法：从首个 { 到匹配 }
    let depth = 0;
    for (let i = firstBrace; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(firstBrace, i + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  throw new Error("无法从 LLM 响应中提取 JSON");
}

/**
 * 把 provider 名（openai / deepseek / ollama / custom）映射到请求所需的 baseUrl + model
 */
function resolveConfig(
  providerName: string,
  config: AiProviderConfig,
): { baseUrl: string; model: string } {
  const baseUrl =
    config.baseUrl?.trim() || DEFAULT_BASE_URLS[providerName] || "";
  const model = config.model?.trim() || DEFAULT_MODELS[providerName] || "gpt-3.5-turbo";
  return { baseUrl, model };
}

/**
 * 创建 OpenAI 兼容 provider
 */
export function createOpenAIProvider(providerName: string): AiProvider {
  return {
    name: "openai",
    requiresApiKey: providerName !== "ollama", // Ollama 本地一般不需要
    displayName: PROVIDER_LABELS[providerName] ?? providerName,

    async callProvider(
      request: AiScheduleRequest,
      config: AiProviderConfig,
    ): Promise<AiScheduleResult> {
      const { baseUrl, model } = resolveConfig(providerName, config);
      if (!baseUrl) {
        throw new Error("未配置 Base URL，请在设置页填写");
      }

      const apiKey = config.apiKey?.trim();
      if (providerName !== "ollama" && !apiKey) {
        throw new Error("未配置 API Key，请在设置页填写");
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

      // 大多数 OpenAI 兼容服务支持 response_format: { type: "json_object" }
      // 但部分（Ollama、vLLM 部分版本）不支持，所以采用 prompt 约束 + 后备 JSON 提取
      const useJsonFormat = !["ollama"].includes(providerName);

      const body = {
        model,
        temperature: config.temperature ?? 0.3,
        max_tokens: config.maxTokens ?? 2048,
        messages: [
          { role: "system", content: AI_SCHEDULE_SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(request) },
        ],
        ...(useJsonFormat ? { response_format: { type: "json_object" } } : {}),
      };

      const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `LLM 请求失败 (${res.status}): ${text.slice(0, 200) || res.statusText}`,
        );
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("LLM 返回内容为空");
      }

      const parsed = extractJson(content) as {
        blocks?: Array<{
          taskTitle?: string;
          taskId?: string;
          startTime?: string;
          endTime?: string;
          priority?: number;
          rationale?: string;
        }>;
        reasoning?: string;
      };

      // 标准化 blocks
      const blocks = (parsed.blocks ?? [])
        .filter((b) => b.taskTitle && b.startTime && b.endTime)
        .map((b) => ({
          taskTitle: b.taskTitle!,
          taskId: b.taskId,
          startTime: b.startTime!,
          endTime: b.endTime!,
          priority: b.priority,
          rationale: b.rationale,
        }));

      return {
        blocks,
        reasoning: parsed.reasoning,
        rawResponse: data,
      };
    },
  };
}

/**
 * provider 名 → 中文显示名
 */
export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  deepseek: "DeepSeek",
  moonshot: "月之暗面 Moonshot",
  ollama: "Ollama（本地）",
  custom: "自定义（OpenAI 兼容）",
};
