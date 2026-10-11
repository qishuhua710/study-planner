/**
 * 模式开关（学习 / 工作 / 健身）
 *
 * - 存储在 userStorage（按登录用户隔离 + 云同步）
 * - 默认全部开启（保持旧行为：所有任务都可见）
 * - 日历等页面按开启的模式过滤任务 / 时间块
 */

import { useState, useEffect } from "react";
import { userStorage, notifyDataChanged } from "./user-storage";
import { TASK_MODES, type TaskMode } from "./tasks";

const KEY = "study-planner:enabled-modes";

function readEnabled(): TaskMode[] {
  if (typeof window === "undefined") return [...TASK_MODES];
  try {
    const raw = userStorage.getItem(KEY);
    if (!raw) return [...TASK_MODES];
    const parsed = JSON.parse(raw) as TaskMode[];
    // 过滤非法值
    const valid = parsed.filter((m) => TASK_MODES.includes(m));
    // 至少保留一个模式
    return valid.length > 0 ? valid : [...TASK_MODES];
  } catch {
    return [...TASK_MODES];
  }
}

export function getEnabledModes(): TaskMode[] {
  return readEnabled();
}

export function setEnabledModes(modes: TaskMode[]): void {
  const valid = modes.filter((m) => TASK_MODES.includes(m));
  if (valid.length === 0) return; // 至少保留一个模式
  userStorage.setItem(KEY, JSON.stringify(valid));
  notifyDataChanged();
}

/**
 * React hook：当前启用的模式集合（随 data-changed 事件自动刷新）
 * 返回 Set 形式便于 O(1) 判断，附带 toggleMode / setAll 操作
 */
export function useEnabledModes(): {
  enabled: Set<TaskMode>;
  toggleMode: (mode: TaskMode) => void;
  setAll: (enabled: boolean) => void;
} {
  const [modes, setModes] = useState<Set<TaskMode>>(new Set(TASK_MODES));

  useEffect(() => {
    const sync = () => setModes(new Set(readEnabled()));
    sync();
    window.addEventListener("study-planner:data-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("study-planner:data-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggleMode(mode: TaskMode) {
    const current = readEnabled();
    const next = current.includes(mode)
      ? current.filter((m) => m !== mode)
      : [...current, mode];
    setEnabledModes(next); // 全关时 setEnabledModes 会拒绝，保证至少一个
  }

  function setAll(enabled: boolean) {
    setEnabledModes(enabled ? [...TASK_MODES] : ["study"]);
  }

  return { enabled: modes, toggleMode, setAll };
}
