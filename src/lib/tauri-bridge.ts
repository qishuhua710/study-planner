/**
 * Tauri 桌面端桥接层
 *
 * 设计要点：
 * - 通过 window.__TAURI__（withGlobalTauri: true）访问原生能力，不直接 import @tauri-apps/api，
 *   避免 Next.js 打包时对 ESM 模块的解析问题。
 * - 浏览器环境（普通网页）下所有方法优雅降级，PWA 也能正常跑。
 * - 仅在客户端运行（所有调用都判断 typeof window）。
 */

// Tauri v2 全局 API 的类型声明
declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(
          cmd: string,
          args?: Record<string, unknown>,
        ) => Promise<T>;
      };
    };
  }
}

/**
 * 是否运行在 Tauri 桌面环境。
 * 浏览器 / PWA 下返回 false。
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && !!window.__TAURI__;
}

/**
 * 读取「开机自启动」当前状态。
 * 非桌面环境返回 false。
 */
export async function getAutostartEnabled(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await window.__TAURI__!.core.invoke<boolean>("is_autostart_enabled");
  } catch {
    return false;
  }
}

/**
 * 开启 / 关闭「开机自启动」。
 * @returns 操作是否成功
 */
export async function setAutostartEnabled(enabled: boolean): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await window.__TAURI__!.core.invoke<boolean>("set_autostart", {
      enabled,
    });
  } catch {
    return false;
  }
}
