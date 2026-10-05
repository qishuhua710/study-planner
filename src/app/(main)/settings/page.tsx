"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
  Bot,
  Clock,
  CalendarOff,
  Plus,
  Trash2,
  RotateCcw,
  CalendarDays,
  Info,
  RefreshCw,
  Cloud,
  CloudOff,
  Loader2,
  Power,
} from "lucide-react";
import {
  isTauri,
  getAutostartEnabled,
  setAutostartEnabled,
} from "@/lib/tauri-bridge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getHolidays,
  addHoliday,
  removeHoliday,
  getPeriodTimes,
  setPeriodTimes,
  resetPeriodTimes,
  generateId,
  type Holiday,
  type PeriodTimes,
} from "@/lib/course-storage";
import {
  downloadBackup,
  readBackupFile,
  importAllData,
  exportAllData,
  clearAllData,
} from "@/lib/data-port";
import {
  getHolidaySource,
  setHolidaySource,
  fetchHolidayCalendar,
  getCacheInfo,
  clearCache,
  type HolidaySource,
} from "@/lib/holiday-api";
import {
  getAiConfig,
  saveAiConfig,
  clearAiConfig,
  DEFAULT_AI_CONFIG,
  type AiConfig,
  type AiProviderName,
} from "@/lib/ai-config";
import { PROVIDER_LABELS } from "@/lib/ai-providers";
import { cn } from "@/lib/utils";

const themes = [
  { key: "light", label: "浅色", icon: Sun },
  { key: "dark", label: "深色", icon: Moon },
  { key: "system", label: "跟随系统", icon: Monitor },
] as const;

/**
 * 紧凑时间输入控件（HH:MM 两个独立 input，避免浏览器本地化干扰）
 */
function TimeField({
  value,
  onChange,
}: {
  value: string; // "HH:mm"
  onChange: (next: string) => void;
}) {
  const [hh, mm] = value.split(":");
  const setHH = (h: string) => {
    const n = Math.max(0, Math.min(23, parseInt(h, 10) || 0));
    onChange(`${String(n).padStart(2, "0")}:${mm || "00"}`);
  };
  const setMM = (m: string) => {
    const n = Math.max(0, Math.min(59, parseInt(m, 10) || 0));
    onChange(`${hh || "00"}:${String(n).padStart(2, "0")}`);
  };
  return (
    <div className="flex h-7 items-center rounded-md border bg-background px-1 text-xs tabular-nums">
      <input
        type="number"
        min={0}
        max={23}
        value={hh ?? ""}
        onChange={(e) => setHH(e.target.value)}
        className="w-7 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="text-muted-foreground/60">:</span>
      <input
        type="number"
        min={0}
        max={59}
        value={mm ?? ""}
        onChange={(e) => setMM(e.target.value)}
        className="w-7 bg-transparent text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  // 防止 SSR/CSR 不匹配：next-themes 客户端 hydrate 后 theme 才有值
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const [pomodoro, setPomodoro] = useState(() => {
    if (typeof window === "undefined") return 25;
    const raw = localStorage.getItem("study-planner:pomodoro-count");
    if (raw) {
      const v = parseInt(raw, 10);
      if (!Number.isNaN(v) && v >= 5 && v <= 90) return v;
    }
    return 25;
  });
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [periodTimes, setLocalPeriodTimes] = useState<PeriodTimes>({});
  const [dataMessage, setDataMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 日历数据源状态
  const [holidaySource, setHolidaySourceState] = useState<HolidaySource>("local");
  const [apiLoading, setApiLoading] = useState(false);
  const [apiInfo, setApiInfo] = useState(() =>
    typeof window !== "undefined" ? getCacheInfo() : null,
  );

  // AI 排程配置
  const [aiConfig, setAiConfigState] = useState<AiConfig>(DEFAULT_AI_CONFIG);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<
    { ok: true; msg: string } | { ok: false; msg: string } | null
  >(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setAiConfigState(getAiConfig());
  }, []);

  // 桌面端（Tauri）开机自启动状态
  const [isDesktop, setIsDesktop] = useState(false);
  const [autostartEnabled, setAutostartEnabledState] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(false);

  useEffect(() => {
    setHolidays(getHolidays());
    setLocalPeriodTimes(getPeriodTimes());
    setHolidaySourceState(getHolidaySource());
    setApiInfo(getCacheInfo());
    // 桌面环境：读取开机自启动当前状态
    if (isTauri()) {
      setIsDesktop(true);
      getAutostartEnabled().then(setAutostartEnabledState);
    }
  }, []);

  function handleAddHoliday() {
    if (!newName || !newStart || !newEnd) return;
    if (newStart > newEnd) {
      toast.error("开始日期不能晚于结束日期");
      return;
    }
    const h: Holiday = {
      id: generateId(),
      name: newName,
      startDate: newStart,
      endDate: newEnd,
      type: "holiday",
    };
    addHoliday(h);
    setHolidays(getHolidays());
    setNewName("");
    setNewStart("");
    setNewEnd("");
    toast.success(`已添加假期：${newName}`);
  }

  function handleRemoveHoliday(id: string) {
    removeHoliday(id);
    setHolidays(getHolidays());
  }

  function handlePeriodTimeChange(period: number, idx: 0 | 1, value: string) {
    const next = { ...periodTimes };
    if (!next[period]) next[period] = ["00:00", "00:00"];
    next[period] = [...next[period]] as [string, string];
    next[period][idx] = value;
    setLocalPeriodTimes(next);
  }

  function savePeriodTimes() {
    setPeriodTimes(periodTimes);
    toast.success("节次时间已保存");
  }

  function savePomodoro(v: number) {
    localStorage.setItem("study-planner:pomodoro-count", String(v));
    window.dispatchEvent(new Event("study-planner:settings-changed"));
  }

  function handleResetPeriodTimes() {
    resetPeriodTimes();
    setLocalPeriodTimes(getPeriodTimes());
  }

  // ==================== 数据导出/导入 ====================

  function showDataMessage(type: "success" | "error", text: string) {
    setDataMessage({ type, text });
    // 4 秒后自动消失
    setTimeout(() => setDataMessage(null), 4000);
  }

  function handleExport() {
    try {
      const payload = exportAllData();
      const counts = {
        tasks: payload.data.tasks.length,
        timeBlocks: payload.data.timeBlocks.length,
        courses: payload.data.courses.length,
        sessions: payload.data.sessions.length,
        holidays: payload.data.holidays.length,
      };
      downloadBackup();
      showDataMessage(
        "success",
        `已导出：任务 ${counts.tasks}、时间块 ${counts.timeBlocks}、课程 ${counts.courses}、课时 ${counts.sessions}、假期 ${counts.holidays}`,
      );
    } catch (err) {
      showDataMessage("error", `导出失败：${(err as Error).message}`);
    }
  }

  async function handleImport(file: File) {
    try {
      const payload = await readBackupFile(file);
      const counts = {
        tasks: payload.data.tasks.length,
        timeBlocks: payload.data.timeBlocks.length,
        courses: payload.data.courses.length,
      };
      const confirmed = window.confirm(
        `即将覆盖当前所有数据：\n任务 ${counts.tasks} 项、时间块 ${counts.timeBlocks} 个、课程 ${counts.courses} 门\n\n确定要继续吗？`,
      );
      if (!confirmed) return;
      importAllData(payload);
      showDataMessage(
        "success",
        "导入成功！页面数据已更新，刷新其他页面查看",
      );
      // 刷新当前页面的本地状态
      setHolidays(getHolidays());
      setLocalPeriodTimes(getPeriodTimes());
    } catch (err) {
      showDataMessage("error", `导入失败：${(err as Error).message}`);
    }
  }

  function handleClearAll() {
    const confirmed = window.confirm(
      "确定要清空所有数据吗？\n\n将清除：任务、时间块、课程/课时、假期、节次时间、备注/重点、分类。\n\n清空后会回到首次启动的演示状态（只有默认样例数据）。",
    );
    if (!confirmed) return;
    clearAllData();
    showDataMessage("success", "已清空所有数据，刷新页面后查看效果");
    // 刷新当前页状态（会回到种子）
    setHolidays(getHolidays());
    setLocalPeriodTimes(getPeriodTimes());
  }

  // ==================== 日历数据源 ====================

  async function handleSwitchToApi() {
    setApiLoading(true);
    try {
      const entries = await fetchHolidayCalendar(true); // force refresh
      setHolidaySource("api");
      setHolidaySourceState("api");
      setApiInfo(getCacheInfo());
      showDataMessage(
        "success",
        `已切换到在线 API，加载 ${entries.length} 条节假日/调休数据`,
      );
    } catch (err) {
      showDataMessage(
        "error",
        `API 拉取失败：${(err as Error).message}。请检查网络后重试。`,
      );
    } finally {
      setApiLoading(false);
    }
  }

  function handleSwitchToLocal() {
    setHolidaySource("local");
    setHolidaySourceState("local");
    showDataMessage("success", "已切换到本地内置数据源");
  }

  // ===== AI 配置 handlers =====
  function updateAiConfig<K extends keyof AiConfig>(key: K, value: AiConfig[K]) {
    setAiConfigState((prev) => ({ ...prev, [key]: value }));
    setAiTestResult(null);
  }

  function handleProviderChange(provider: AiProviderName) {
    // 切换 provider 时，自动填默认 baseUrl + model（用户可后续修改）
    const defaults: Record<AiProviderName, Partial<AiConfig>> = {
      openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
      deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
      moonshot: { baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
      ollama: { baseUrl: "http://localhost:11434/v1", model: "llama3.1" },
      custom: {},
    };
    setAiConfigState((prev) => ({
      ...prev,
      provider,
      ...defaults[provider],
    }));
    setAiTestResult(null);
  }

  function handleSaveAi() {
    saveAiConfig(aiConfig);
    showDataMessage("success", "AI 排程配置已保存");
  }

  function handleClearAi() {
    clearAiConfig();
    setAiConfigState(DEFAULT_AI_CONFIG);
    setAiTestResult(null);
    showDataMessage("success", "已清除 AI 配置，将回退到本地规则排程");
  }

  async function handleTestAi() {
    setAiTesting(true);
    setAiTestResult(null);
    try {
      // 临时保存当前配置，再测试
      saveAiConfig(aiConfig);
      const { runAiSchedule } = await import("@/lib/ai-scheduler");
      const { getTasks } = await import("@/lib/tasks");
      const { getSessions } = await import("@/lib/course-storage");
      const { getTimeBlocks } = await import("@/lib/time-blocks");
      const { getPeriodTimes } = await import("@/lib/course-storage");

      const today = new Date();
      const dateStr = format(today, "yyyy-MM-dd");
      const tasks = getTasks().filter((t) => t.status !== "done").slice(0, 3);
      const result = await runAiSchedule(
        {
          date: dateStr,
          tasks,
          sessions: getSessions(),
          existingBlocks: getTimeBlocks(),
          periodTimes: getPeriodTimes(),
          preferences: { maxBlockMinutes: 60 },
        },
        {
          providerName: aiConfig.provider,
          baseUrl: aiConfig.baseUrl,
          apiKey: aiConfig.apiKey,
          model: aiConfig.model,
          temperature: aiConfig.temperature,
          maxTokens: 256, // 测试用，省 token
        },
      );
      setAiTestResult({
        ok: true,
        msg: `连接成功！${result.reasoning ? result.reasoning + " · " : ""}返回 ${result.blocks.length} 个建议块`,
      });
    } catch (err) {
      setAiTestResult({ ok: false, msg: (err as Error).message });
    } finally {
      setAiTesting(false);
    }
  }

  async function handleRefreshApi() {
    setApiLoading(true);
    try {
      const entries = await fetchHolidayCalendar(true);
      setApiInfo(getCacheInfo());
      showDataMessage(
        "success",
        `刷新成功，最新数据 ${entries.length} 条`,
      );
    } catch (err) {
      showDataMessage(
        "error",
        `刷新失败：${(err as Error).message}`,
      );
    } finally {
      setApiLoading(false);
    }
  }

  function handleClearApiCache() {
    clearCache();
    setApiInfo(getCacheInfo());
    showDataMessage("success", "已清除 API 缓存");
  }

  // ==================== 桌面端：开机自启动 ====================

  async function handleToggleAutostart() {
    setAutostartLoading(true);
    const next = !autostartEnabled;
    const ok = await setAutostartEnabled(next);
    if (ok) {
      setAutostartEnabledState(next);
      showDataMessage(
        "success",
        next ? "已开启开机自启动" : "已关闭开机自启动",
      );
    } else {
      showDataMessage("error", "设置失败，请稍后重试");
    }
    setAutostartLoading(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">设置</h2>

      {/* 外观 */}
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Sun className="h-4 w-4" /> 外观
        </h3>
        <div className="flex items-center gap-2">
          {themes.map((t) => (
            <button
              key={t.key}
              onClick={() => setTheme(t.key)}
              suppressHydrationWarning
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-md border p-3 transition-colors",
                mounted && theme === t.key
                  ? "border-primary bg-primary/5"
                  : "hover:bg-accent",
              )}
            >
              <t.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{t.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* 桌面应用（仅 Tauri 环境显示） */}
      {isDesktop && (
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Power className="h-4 w-4" /> 桌面应用
          </h3>
          {/* 开机自启动开关 */}
          <div className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2.5">
            <div className="flex-1">
              <p className="text-sm font-medium">开机自启动</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                登录系统后自动打开应用
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autostartEnabled}
              onClick={handleToggleAutostart}
              disabled={autostartLoading}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
                autostartEnabled ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  autostartEnabled ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </div>
          {/* 行为提示 */}
          <div className="mt-2 space-y-0.5 rounded-md border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
            <p>· 关闭窗口时自动缩到托盘，不会退出</p>
            <p>· 快捷键 ⌘+⇧+S 随时唤起窗口</p>
          </div>
        </Card>
      )}

      {/* 计时器偏好 */}
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Clock className="h-4 w-4" /> 计时器偏好
        </h3>
        <div className="flex items-center gap-3">
          <Label htmlFor="pomodoro" className="text-sm">
            番茄钟时长
          </Label>
          <Input
            id="pomodoro"
            type="number"
            min={5}
            max={90}
            value={pomodoro}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPomodoro(v);
              savePomodoro(v);
            }}
            className="w-20"
          />
          <span className="text-sm text-muted-foreground">分钟</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          修改后计时器页面的「番茄钟」模式立即生效
        </p>
      </Card>

      {/* 学期假期 */}
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <CalendarOff className="h-4 w-4" /> 学期假期
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          假期内课程自动屏蔽，智能排程只排少量任务
        </p>

        {/* 假期列表 */}
        <div className="mb-3 space-y-1.5">
          {holidays.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted-foreground/60">
              还没有添加假期
            </p>
          ) : (
            holidays.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="flex-1 truncate font-medium">{h.name}</span>
                <span className="text-xs text-muted-foreground">
                  {h.startDate} ~ {h.endDate}
                </span>
                <button
                  onClick={() => handleRemoveHoliday(h.id)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* 添加表单 */}
        <div className="space-y-2 rounded-md border bg-muted/10 p-3">
          <div className="grid grid-cols-3 gap-2">
            <Input
              placeholder="名称（如：国庆）"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <Input
              type="date"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
            />
            <Input
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={handleAddHoliday}
            disabled={!newName || !newStart || !newEnd}
            className="w-full gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> 添加假期
          </Button>
        </div>
      </Card>

      {/* 节次时间 */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4" /> 节次时间
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetPeriodTimes}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> 重置默认
          </Button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          根据本校作息时间调整，导入课表时自动应用
        </p>
        <div className="space-y-1.5">
          {Object.keys(periodTimes)
            .map((k) => parseInt(k, 10))
            .sort((a, b) => a - b)
            .map((p) => {
              const start = periodTimes[p]?.[0] ?? "00:00";
              const end = periodTimes[p]?.[1] ?? "00:00";
              const [sh, sm] = start.split(":").map(Number);
              const [eh, em] = end.split(":").map(Number);
              const durMin =
                !isNaN(sh) && !isNaN(eh) ? eh * 60 + em - (sh * 60 + sm) : 0;

              return (
                <div
                  key={p}
                  className="flex items-center gap-2 rounded-md border bg-muted/10 px-3 py-1.5 text-xs"
                >
                  {/* 节次标 */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary/10 text-[11px] font-semibold text-primary">
                    {p}
                  </span>
                  {/* 开始时间 HH:MM 紧凑控件 */}
                  <TimeField
                    value={start}
                    onChange={(v) => handlePeriodTimeChange(p, 0, v)}
                  />
                  <span className="text-muted-foreground/50">至</span>
                  <TimeField
                    value={end}
                    onChange={(v) => handlePeriodTimeChange(p, 1, v)}
                  />
                  {/* 时长提示 */}
                  <span className="ml-auto text-[10px] text-muted-foreground/60">
                    {durMin > 0 ? `${durMin} 分钟` : ""}
                  </span>
                </div>
              );
            })}
        </div>
        <Button
          size="sm"
          onClick={savePeriodTimes}
          className="mt-3 w-full"
        >
          保存节次时间
        </Button>
      </Card>

      {/* 日历数据源说明 */}
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <CalendarDays className="h-4 w-4" /> 日历数据源
        </h3>

        <div className="space-y-3">
          {/* 数据源切换 */}
          <div className="flex items-center gap-1 rounded-full bg-muted/40 p-0.5">
            <button
              onClick={handleSwitchToLocal}
              disabled={apiLoading}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                holidaySource === "local"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CloudOff className="h-3.5 w-3.5" /> 本地内置
            </button>
            <button
              onClick={handleSwitchToApi}
              disabled={apiLoading}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                holidaySource === "api"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {apiLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cloud className="h-3.5 w-3.5" />
              )}
              在线 API
            </button>
          </div>

          {/* 当前数据源说明 */}
          {holidaySource === "local" ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
              <p className="font-medium">本地内置 · 2025-2026 节假日</p>
              <p className="mt-0.5 text-muted-foreground">
                国务院办公厅放假通知，已内置全年数据，零网络依赖。
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
                <p className="font-medium">在线 API · timor.tech</p>
                <p className="mt-0.5 text-muted-foreground">
                  数据来源：timor.tech（免费、免 key、CORS 友好）
                </p>
                {apiInfo && apiInfo.hasCache && (
                  <p className="mt-1 text-muted-foreground">
                    已缓存 {apiInfo.count} 条 ·{" "}
                    {apiInfo.fetchedAt
                      ? new Date(apiInfo.fetchedAt).toLocaleString("zh-CN")
                      : "—"}
                    {apiInfo.expired && (
                      <span className="ml-1 text-amber-600">
                        · 缓存过期
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshApi}
                  disabled={apiLoading}
                  className="flex-1 gap-1.5 text-xs"
                >
                  {apiLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  刷新数据
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearApiCache}
                  disabled={apiLoading}
                  className="gap-1.5 text-xs text-muted-foreground"
                >
                  清除缓存
                </Button>
              </div>
            </div>
          )}

          {/* 显示规则说明 */}
          <div className="rounded-md border bg-muted/10 p-3 text-xs text-muted-foreground">
            <div className="mb-2 flex items-center gap-1.5 font-medium text-foreground">
              <Info className="h-3.5 w-3.5" /> 日历显示规则
            </div>
            <ul className="space-y-1 pl-1">
              <li>
                · <span className="text-[#A45C3D] font-medium">红色徽章</span>
                ：法定节假日
              </li>
              <li>
                · <span className="text-[#5C8A6B] font-medium">绿色“班”</span>
                ：调休工作日
              </li>
              <li>
                · 灰色“休”：普通周末
              </li>
              <li>· 无标记：普通工作日</li>
              <li className="pt-1 text-muted-foreground/80">
                用户自配的“学期假期”始终优先于其他源。
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 数据管理 */}
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Download className="h-4 w-4" /> 数据管理
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          一键导出所有数据为 JSON 备份文件，或从备份恢复
        </p>

        {/* 操作反馈 */}
        {dataMessage && (
          <div
            className={cn(
              "mb-3 rounded-lg border px-3 py-2 text-xs",
              dataMessage.type === "success"
                ? "border-primary/30 bg-primary/5 text-foreground"
                : "border-destructive/30 bg-destructive/5 text-destructive",
            )}
          >
            {dataMessage.text}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="justify-start gap-2"
            onClick={handleExport}
          >
            <Download className="h-4 w-4" /> 导出全部数据（JSON）
          </Button>

          <label className="inline-flex">
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImport(file);
                e.target.value = ""; // 清空允许重复选同一文件
              }}
            />
            <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground">
              <Upload className="h-4 w-4" /> 从备份导入
            </span>
          </label>
        </div>

        {/* 危险操作 */}
        <div className="mt-4 border-t pt-3">
          <p className="mb-2 text-xs text-muted-foreground">
            危险操作（不可撤销）
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" /> 清空所有数据
          </Button>
        </div>
      </Card>

      {/* AI 排程配置 */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Bot className="h-4 w-4" />
          <h3 className="text-sm font-semibold">AI 智能排程</h3>
          <Badge
            variant="outline"
            className={cn(
              "ml-auto text-[10px]",
              aiConfig.apiKey || aiConfig.provider === "ollama"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "",
            )}
          >
            {aiConfig.apiKey || aiConfig.provider === "ollama" ? "已启用" : "未启用"}
          </Badge>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          接入 LLM（兼容 OpenAI 协议）后，会让 AI 根据当天课程/任务/空闲时段/偏好给出更智能的排程建议。
          未配置时自动回退到本地规则。
          <span className="block mt-1 text-[11px] text-muted-foreground/70">
            API Key 仅存浏览器 localStorage，不会被任何服务器读取。
          </span>
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">提供商</Label>
            <select
              value={aiConfig.provider}
              onChange={(e) =>
                handleProviderChange(e.target.value as AiProviderName)
              }
              className="h-9 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {(Object.keys(PROVIDER_LABELS) as AiProviderName[]).map((k) => (
                <option key={k} value={k}>
                  {PROVIDER_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">API Base URL</Label>
            <Input
              value={aiConfig.baseUrl}
              onChange={(e) => updateAiConfig("baseUrl", e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">模型</Label>
            <Input
              value={aiConfig.model}
              onChange={(e) => updateAiConfig("model", e.target.value)}
              placeholder="gpt-4o-mini / deepseek-chat / ..."
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              API Key{aiConfig.provider === "ollama" && "（Ollama 本地可不填）"}
            </Label>
            <Input
              type="password"
              value={aiConfig.apiKey}
              onChange={(e) => updateAiConfig("apiKey", e.target.value)}
              placeholder="sk-..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={aiConfig.temperature}
                onChange={(e) =>
                  updateAiConfig("temperature", parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Max Tokens</Label>
              <Input
                type="number"
                step="128"
                min="128"
                max="8192"
                value={aiConfig.maxTokens}
                onChange={(e) =>
                  updateAiConfig("maxTokens", parseInt(e.target.value, 10) || 2048)
                }
              />
            </div>
          </div>

          {/* 测试结果 */}
          {aiTestResult && (
            <div
              className={cn(
                "rounded-md px-3 py-2 text-xs",
                aiTestResult.ok
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {aiTestResult.ok ? "✓ " : "✗ "}
              {aiTestResult.msg}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAi}
              className="gap-1.5"
            >
              <Bot className="h-3.5 w-3.5" />
              保存配置
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTestAi}
              disabled={aiTesting || !aiConfig.baseUrl}
              className="gap-1.5"
            >
              {aiTesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Info className="h-3.5 w-3.5" />
              )}
              测试连接
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAi}
              className="gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              清除
            </Button>
          </div>

          <details className="mt-2 rounded-md bg-muted/40 p-3 text-[11px] text-muted-foreground">
            <summary className="cursor-pointer font-medium">
              如何获取 API Key？
            </summary>
            <ul className="mt-2 space-y-1 list-disc pl-4">
              <li>
                <strong>DeepSeek</strong>（推荐，便宜）：deepseek.com → API
                开放平台 → 创建 API Key
              </li>
              <li>
                <strong>月之暗面 Moonshot</strong>：platform.moonshot.cn →
                控制台 → API Key 管理
              </li>
              <li>
                <strong>OpenAI</strong>：platform.openai.com → API keys
                （需海外网络）
              </li>
              <li>
                <strong>Ollama（本地免费）</strong>：安装 Ollama → 拉模型 →
                默认 baseUrl <code className="font-mono">http://localhost:11434/v1</code>
              </li>
            </ul>
            <p className="mt-2">
              注意：浏览器直接调 API，对方需支持 CORS。
              DeepSeek/Moonshot 默认支持，OpenAI 不支持（需中转）。
            </p>
            <p className="mt-2">
              使用 AI 排程前请阅读{" "}
              <a
                href="/legal/ai-disclosure"
                className="text-primary underline-offset-2 hover:underline"
              >
                《AI 使用声明》
              </a>
              。
            </p>
          </details>
        </div>
      </Card>
    </div>
  );
}
