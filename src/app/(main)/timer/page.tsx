"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { addTimeBlock, getTimeBlocksForDate } from "@/lib/time-blocks";
import { getMergedDayStatus } from "@/lib/calendar-cn";
import { getHolidays } from "@/lib/course-storage";

type Mode = "pomodoro" | "countdown" | "stopwatch";

const modes: { key: Mode; label: string }[] = [
  { key: "pomodoro", label: "番茄钟" },
  { key: "countdown", label: "倒计时" },
  { key: "stopwatch", label: "正计时" },
];

const POMODORO_KEY = "study-planner:pomodoro-count";
const POMODORO_LOG_KEY = "study-planner:pomodoro-log";

interface PomodoroLog {
  date: string; // yyyy-MM-dd
  count: number;
  totalMinutes: number;
}

function getTodayLog(): PomodoroLog {
  if (typeof window === "undefined") return { date: "", count: 0, totalMinutes: 0 };
  const today = format(new Date(), "yyyy-MM-dd");
  try {
    const raw = localStorage.getItem(POMODORO_LOG_KEY);
    if (raw) {
      const log = JSON.parse(raw) as PomodoroLog;
      if (log.date === today) return log;
    }
  } catch {
    /* ignore */
  }
  return { date: today, count: 0, totalMinutes: 0 };
}

function saveLog(log: PomodoroLog) {
  if (typeof window === "undefined") return;
  localStorage.setItem(POMODORO_LOG_KEY, JSON.stringify(log));
}

export default function TimerPage() {
  const [mode, setMode] = useState<Mode>("pomodoro");
  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [todayLog, setTodayLog] = useState<PomodoroLog>({
    date: "",
    count: 0,
    totalMinutes: 0,
  });
  const [todayTimeBlocks, setTodayTimeBlocks] = useState(0);
  const [restDayInfo, setRestDayInfo] = useState<{
    isRest: boolean;
    name: string;
    type: "holiday" | "weekend" | "user";
  } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTodayLog(getTodayLog());
    setTodayTimeBlocks(getTimeBlocksForDate(format(new Date(), "yyyy-MM-dd")).length);
    // 检测今天是否是休息日
    const today = new Date();
    const userHolidays = getHolidays().map((h) => ({
      startDate: h.startDate,
      endDate: h.endDate,
      name: h.name,
    }));
    const status = getMergedDayStatus(today, userHolidays);
    if (status.type === "holiday" || status.type === "weekend") {
      setRestDayInfo({
        isRest: true,
        name: status.name || (status.type === "weekend" ? "周末" : "法定假日"),
        type: status.source === "user" ? "user" : status.type,
      });
    } else {
      setRestDayInfo(null);
    }
  }, []);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (mode === "stopwatch") return prev + 1;
          if (prev <= 1) {
            setRunning(false);
            // 完成时累计番茄钟日志（仅番茄钟模式）
            if (mode === "pomodoro") {
              const log = getTodayLog();
              const updated: PomodoroLog = {
                ...log,
                count: log.count + 1,
                totalMinutes: log.totalMinutes + Math.round(duration / 60),
              };
              saveLog(updated);
              setTodayLog(updated);
              toast.success(`🎉 番茄钟完成！已累计 ${updated.count} 个`);
              try {
                // 桌面端原生通知（浏览器/PWA）
                if (
                  typeof Notification !== "undefined" &&
                  Notification.permission === "granted"
                ) {
                  new Notification("番茄钟完成", {
                    body: `今日已完成 ${updated.count} 个番茄钟`,
                  });
                }
              } catch {
                /* ignore */
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, duration]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setRunning(false);
    if (m === "pomodoro") {
      const mins = readPomodoroDefault();
      setDuration(mins * 60);
      setRemaining(mins * 60);
    } else if (m === "countdown") {
      setDuration(15 * 60);
      setRemaining(15 * 60);
    } else {
      setRemaining(0);
    }
  };

  const setCustomDuration = (mins: number) => {
    const secs = Math.max(1, mins) * 60;
    setDuration(secs);
    setRemaining(secs);
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setRemaining(mode === "stopwatch" ? 0 : duration);
  };

  // 番茄钟/倒计时完成时把已做时段落到时间块里
  function handleRecordAsBlock() {
    if (duration === 0) return;
    const now = new Date();
    const end = new Date(now.getTime());
    const start = new Date(now.getTime() - (duration - remaining) * 1000);
    // 如果刚跑完（remaining=0），用整段 duration
    const actualMins = Math.max(
      1,
      Math.round((duration - remaining) / 60) || Math.round(duration / 60),
    );
    const realStart = remaining === 0 ? new Date(now.getTime() - actualMins * 60 * 1000) : start;
    const todayKey = format(now, "yyyy-MM-dd");
    addTimeBlock({
      title:
        mode === "pomodoro"
          ? "番茄钟"
          : mode === "countdown"
            ? "专注时段"
            : "正计时",
      startTime: `${todayKey} ${format(realStart, "HH:mm")}`,
      endTime: `${todayKey} ${format(end, "HH:mm")}`,
    });
    setTodayTimeBlocks((c) => c + 1);
    toast.success(`已记录 ${actualMins} 分钟到今天的时间块`);
  }

  // 快捷休息：切到 5 分钟倒计时
  function handleQuickBreak() {
    switchMode("countdown");
    setCustomDuration(5);
    setRunning(true);
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const progress =
    mode !== "stopwatch" && duration > 0
      ? ((duration - remaining) / duration) * 100
      : 0;

  return (
    <div className="mx-auto max-w-md space-y-8">
      {/* 休息日友好提示：非强制，只是提醒 */}
      {restDayInfo?.isRest && (
        <div className="flex items-start gap-3 rounded-2xl bg-[#8B9D6B]/10 px-4 py-3 text-sm">
          <Coffee className="mt-0.5 h-4 w-4 shrink-0 text-[#5C8A6B]" />
          <div className="flex-1">
            <p className="font-medium text-[#5C8A6B]">
              今天是{restDayInfo.type === "weekend" ? "周末" : restDayInfo.name}（休息日）
            </p>
            <p className="mt-0.5 text-xs text-foreground/70">
              休息也是学习的一部分。如果想轻松一点，可以做 15 分钟番茄钟；想冲刺也完全可以。
            </p>
          </div>
        </div>
      )}

      {/* 模式切换：胶囊式 */}
      <div className="flex items-center justify-center gap-1 rounded-full bg-muted/60 p-1">
        {modes.map((m) => (
          <button
            key={m.key}
            onClick={() => switchMode(m.key)}
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all",
              mode === m.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 计时器：无边框，纯留白 */}
      <div className="flex flex-col items-center gap-6 py-4">
        {/* 进度环：更优雅 */}
        <div className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            {mode !== "stopwatch" && (
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 46}
                strokeDashoffset={2 * Math.PI * 46 * (1 - progress / 100)}
                className="transition-all duration-500"
              />
            )}
          </svg>
          <div className="flex flex-col items-center gap-1">
            <span className="text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
              {formatTime(remaining)}
            </span>
            <span className="text-sm text-muted-foreground">
              {running ? "专注中" : mode === "stopwatch" ? "正计时" : "已暂停"}
            </span>
          </div>
        </div>

        {/* 控制：大圆按钮 */}
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            onClick={() => setRunning((r) => !r)}
            className="h-14 gap-2 rounded-full px-8 text-base"
          >
            {running ? (
              <>
                <Pause className="h-5 w-5" /> 暂停
              </>
            ) : (
              <>
                <Play className="h-5 w-5" /> 开始
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={reset}
            className="h-12 w-12 rounded-full"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* 时长预设 */}
        {mode !== "stopwatch" && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">时长</Label>
            {[15, 25, 30, 45].map((m) => (
              <button
                key={m}
                onClick={() => setCustomDuration(m)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  duration === m * 60
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {m}分
              </button>
            ))}
            <Input
              type="number"
              min={1}
              max={180}
              defaultValue={mode === "pomodoro" ? readPomodoroDefault() : 15}
              onChange={(e) => setCustomDuration(Number(e.target.value))}
              className="h-7 w-16 rounded-full px-2 text-xs"
            />
          </div>
        )}
      </div>

      {/* 底部统计：极简行 */}
      <div className="flex items-center justify-center gap-8 border-t pt-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{todayLog.count}</p>
          <p className="text-[11px] text-muted-foreground">
            今日番茄钟
            {todayLog.totalMinutes > 0 && (
              <span className="ml-1 text-foreground/60">
                · {todayLog.totalMinutes} 分钟
              </span>
            )}
          </p>
        </div>
        <div className="h-8 w-px bg-border" />
        <button
          onClick={handleQuickBreak}
          className="flex flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          title="切到 5 分钟倒计时自动开始"
        >
          <Coffee className="h-5 w-5" />
          <span className="text-[11px]">休息 5 分钟</span>
        </button>
        <button
          onClick={handleRecordAsBlock}
          className="flex flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          title="把本次专注时段写入今日时间块"
        >
          <Check className="h-5 w-5" />
          <span className="text-[11px]">记录时间块</span>
        </button>
      </div>

      {/* 今日时间块小提示 */}
      {todayTimeBlocks > 0 && (
        <p className="text-center text-xs text-muted-foreground/70">
          今日已规划 {todayTimeBlocks} 个时间块 ·{" "}
          <a href="/calendar" className="text-primary hover:underline">
            在日历查看
          </a>
        </p>
      )}
    </div>
  );
}

function readPomodoroDefault(): number {
  if (typeof window === "undefined") return 25;
  try {
    const raw = localStorage.getItem(POMODORO_KEY);
    if (raw) {
      const v = parseInt(raw, 10);
      if (!Number.isNaN(v) && v >= 5 && v <= 90) return v;
    }
  } catch {
    /* ignore */
  }
  return 25;
}