"use client";

import { useState, useMemo, useEffect } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
  addMonths,
  subMonths,
  addDays,
  addWeeks,
  subWeeks,
  startOfDay,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { getDueStatus } from "@/lib/task-due";
import type { Priority } from "@/lib/mock-data";

const priorityDot: Record<Priority, string> = {
  high: "bg-[#A45C3D]",
  medium: "bg-[#8B9D6B]",
  low: "bg-[#7C8471]",
};
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Star,
  NotebookPen,
  Pencil,
  Trash2,
  Clock,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTasks } from "@/lib/tasks";
import {
  getCourses,
  getSessions,
  isHoliday,
  hasClassOnDate,
  getPeriodTimes,
} from "@/lib/course-storage";
import {
  getTimeBlocksForDate,
  addTimeBlocks,
  detectConflicts,
  getTimeBlocks,
  moveTimeBlockToDate,
  moveTimeBlockToTime,
  extractDate,
  type TimeBlock,
} from "@/lib/time-blocks";
import {
  suggestSchedule,
  type TaskForScheduling,
  type SuggestedBlock,
} from "@/lib/scheduler";
import {
  getDayNote,
  clearDayNote,
  setStarred,
  setNote,
  type DayNote,
} from "@/lib/day-notes";
import { getMergedDayStatus } from "@/lib/calendar-cn";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  getHolidaySource,
  getCachedHolidayCalendar,
  type ApiCalendarEntry,
} from "@/lib/holiday-api";
import { DayMenu } from "@/components/calendar/day-menu";
import { TimeBlockDialog } from "@/components/calendar/time-block-dialog";
import { cn } from "@/lib/utils";

const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
const viewTabs = [
  { key: "month", label: "月" },
  { key: "week", label: "周" },
  { key: "day", label: "日" },
] as const;

type ViewKey = (typeof viewTabs)[number]["key"];

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function dateLabelCN(date: Date): string {
  return format(date, "M月d日 EEEE", { locale: zhCN });
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewKey>("month");
  const [currentDate, setCurrentDate] = useState(new Date(2026, 8, 17));
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    new Date(2026, 8, 17),
  );
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuDate, setMenuDate] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [tbDialogOpen, setTbDialogOpen] = useState(false);
  const [tbDialogDate, setTbDialogDate] = useState("");
  const [tbDialogStart, setTbDialogStart] = useState("19:00");
  const [tbDialogEnd, setTbDialogEnd] = useState("20:00");
  const [editingTimeBlock, setEditingTimeBlock] =
    useState<TimeBlock | null>(null);
  // ===== 拖拽状态 =====
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null);
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  // 用于 DragOverlay 渲染
  const [draggingBlock, setDraggingBlock] = useState<TimeBlock | null>(null);
  // 拖拽相关组件含 dnd-kit 属性（aria-describedby 等），
  // 客户端 useUniqueId 与 SSR 模块级计数器会不一致，必须等挂载后再渲染
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // 避免点击误触发拖拽
    }),
  );

  // 监听跨标签页 localStorage 变更（设置页切换数据源时自动刷新）
  useEffect(() => {
    function onStorage() {
      setRefreshKey((k) => k + 1);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ==================== 数据计算 ====================

  // 当前视图的日期范围
  const viewDays = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
      const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    }
    if (view === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return eachDayOfInterval({ start, end });
    }
    return [startOfDay(currentDate)];
  }, [currentDate, view]);

  // 在线 API 节假日数据（仅当数据源 = api 时使用）
  const apiHolidayEntries = useMemo(() => {
    if (getHolidaySource() !== "api") return [];
    return getCachedHolidayCalendar();
    // refreshKey 触发重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    // 真实任务（按 dueDate），按到期状态着色
    const tasks = getTasks();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      // 默认按优先级
      let color =
        t.priority === "high"
          ? "#A45C3D"
          : t.priority === "medium"
            ? "#8B9D6B"
            : "#7C8471";
      // 已完成 → 灰
      // 逾期未完成 → 警示红
      // 今日未完成 → 暖橙
      let urgency: "normal" | "today" | "overdue" = "normal";
      if (t.status !== "done") {
        const due = getDueStatus(t.dueDate);
        if (due === "overdue") {
          color = "#B5453B"; // 警示红
          urgency = "overdue";
        } else if (due === "today") {
          color = "#A45C3D";
          urgency = "today";
        }
      }
      const list = map.get(t.dueDate) ?? [];
      list.push({
        id: t.id,
        title: t.title,
        date: t.dueDate,
        color,
        type: "task",
        priority: t.priority,
        urgency,
        done: t.status === "done",
      });
      map.set(t.dueDate, list);
    }

    return map;
    // refreshKey 触发重算（创建/编辑任务后）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // 当天课程
  const selectedDayCourses = useMemo(() => {
    if (!selectedDate) return [];
    const sessions = getSessions().filter(
      (s) => s.weekday === selectedDate.getDay(),
    );
    const courses = getCourses();
    return sessions
      .map((s) => ({
        session: s,
        course: courses.find((c) => c.id === s.courseId),
      }))
      .filter((x) => x.course)
      .sort((a, b) => a.session.periodStart - b.session.periodStart);
  }, [selectedDate]);

  // 当天时间块
  const selectedDayTimeBlocks = useMemo(() => {
    if (!selectedDate) return [];
    const blocks = getTimeBlocksForDate(dateKey(selectedDate));
    // 预关联 task，UI 直接读取避免每次 render 调 getTasks
    const taskMap = new Map(
      getTasks().map((t) => [t.id, t] as const),
    );
    return blocks
      .map((b) => ({
        ...b,
        linkedTask: b.taskId ? taskMap.get(b.taskId) : undefined,
      }))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    // refreshKey 触发重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, refreshKey]);

  // AI 排程结果
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedBlock[]>([]);
  const [aiReasoning, setAiReasoning] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [useAi, setUseAi] = useState(false);

  // 智能排程建议
  const suggestions: SuggestedBlock[] = useMemo(() => {
    if (!selectedDate || !showSuggestion) return [];
    if (useAi) return []; // 用 AI 模式时，本地建议不用
    const tasks: TaskForScheduling[] = getTasks().map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      estimatedMinutes: 30,
    }));
    return suggestSchedule(selectedDate, tasks);
    // refreshKey 触发重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, showSuggestion, useAi, refreshKey]);

  const selectedEvents = selectedDate
    ? eventsByDate.get(dateKey(selectedDate)) ?? []
    : [];

  const selectedDayNote: DayNote | null = useMemo(() => {
    if (!selectedDate) return null;
    return getDayNote(dateKey(selectedDate));
    // refreshKey 触发重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, refreshKey]);

  // ==================== 事件处理 ====================

  function handleCellClick(day: Date, e: React.MouseEvent<HTMLButtonElement>) {
    setSelectedDate(day);
    setMenuDate(day);
    setMenuAnchor(e.currentTarget);
    setMenuOpen(true);
    setEditingNote(false);
  }

  function handleMenuChanged() {
    setRefreshKey((k) => k + 1);
  }

  function handleStartEditNote() {
    setNoteDraft(selectedDayNote?.note ?? "");
    setEditingNote(true);
  }

  function handleSaveNote() {
    if (!selectedDate) return;
    const dateStr = dateKey(selectedDate);
    setNote(dateStr, noteDraft.trim());
    setEditingNote(false);
    handleMenuChanged();
  }

  function handleToggleStar() {
    if (!selectedDate) return;
    const dateStr = dateKey(selectedDate);
    const newStarred = !selectedDayNote?.starred;
    setStarred(dateStr, newStarred);
    handleMenuChanged();
  }

  function handleDeleteNote() {
    if (!selectedDate) return;
    clearDayNote(dateKey(selectedDate));
    setEditingNote(false);
    handleMenuChanged();
  }

  // 视图导航
  function navigate(direction: -1 | 1) {
    if (view === "month") {
      setCurrentDate((d) =>
        direction === 1 ? addMonths(d, 1) : subMonths(d, 1),
      );
    } else if (view === "week") {
      setCurrentDate((d) =>
        direction === 1 ? addWeeks(d, 1) : subWeeks(d, 1),
      );
    } else {
      setCurrentDate((d) => addDays(d, direction));
    }
  }

  function handleAddTimeBlock(date: string, start = "19:00", end = "20:00") {
    setEditingTimeBlock(null);
    setTbDialogDate(date);
    setTbDialogStart(start);
    setTbDialogEnd(end);
    setTbDialogOpen(true);
  }

  function handleEditTimeBlock(tb: TimeBlock) {
    setEditingTimeBlock(tb);
    setTbDialogOpen(true);
  }

  function handleConfirmSuggestion() {
    if (!selectedDate || suggestions.length === 0) return;
    const dateStr = dateKey(selectedDate);
    // 根据 taskTitle 查找对应任务 ID（用于关联任务）
    const allTasks = getTasks();
    const newBlocks = addTimeBlocks(
      suggestions.map((s) => {
        // 尝试通过标题匹配任务（智能排程的 taskTitle 就是任务 title）
        const matchedTask = allTasks.find((t) => t.title === s.taskTitle);
        return {
          title: s.taskTitle,
          startTime: `${dateStr} ${s.startTime}`,
          endTime: `${dateStr} ${s.endTime}`,
          taskId: matchedTask?.id,
        };
      }),
    );
    handleMenuChanged();
    setShowSuggestion(false);
    toast.success(`已写入 ${newBlocks.length} 个时间块，可在「时间块」中查看`);
  }

  /**
   * 调用 AI provider 排程
   */
  async function handleAiSchedule() {
    if (!selectedDate) return;
    setAiLoading(true);
    try {
      const { runAiSchedule } = await import("@/lib/ai-scheduler");
      const { getAiConfig } = await import("@/lib/ai-config");
      const { createOpenAIProvider } = await import("@/lib/ai-providers");
      const { registerAiProvider } = await import("@/lib/ai-scheduler");
      const { getSessions, getPeriodTimes } = await import("@/lib/course-storage");
      const { getTimeBlocks } = await import("@/lib/time-blocks");

      const cfg = getAiConfig();
      // 动态注册 OpenAI 兼容 provider
      const aiProvider = createOpenAIProvider(cfg.provider);
      registerAiProvider(aiProvider);

      const dateStr = dateKey(selectedDate);
      const tasks = getTasks().filter((t) => t.status !== "done");
      if (tasks.length === 0) {
        toast.info("没有待办任务，无需排程");
        return;
      }

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
          providerName: cfg.provider,
          baseUrl: cfg.baseUrl,
          apiKey: cfg.apiKey,
          model: cfg.model,
          temperature: cfg.temperature,
          maxTokens: cfg.maxTokens,
        },
      );

      // 转成统一的 SuggestedBlock 格式
      const blocks: SuggestedBlock[] = result.blocks
        .filter((b) => b.startTime && b.endTime)
        .map((b) => {
          const [sh, sm] = b.startTime.split(":").map(Number);
          const [eh, em] = b.endTime.split(":").map(Number);
          // 通过 taskTitle 匹配任务
          const matchedTask = tasks.find((t) => t.title === b.taskTitle);
          return {
            taskId: matchedTask?.id ?? b.taskId ?? "",
            taskTitle: b.taskTitle,
            priority: matchedTask?.priority ?? "medium",
            startTime: b.startTime,
            endTime: b.endTime,
            duration: (eh ?? 0) * 60 + (em ?? 0) - (sh ?? 0) * 60 - (sm ?? 0),
          };
        });

      setAiSuggestions(blocks);
      setAiReasoning(result.reasoning ?? "");
      setUseAi(true);
      setShowSuggestion(true);
      toast.success(`AI 已返回 ${blocks.length} 个建议`);
    } catch (err) {
      toast.error(`AI 排程失败：${(err as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  }

  function handleConfirmAiSuggestion() {
    if (!selectedDate || aiSuggestions.length === 0) return;
    const dateStr = dateKey(selectedDate);
    const allTasks = getTasks();
    const newBlocks = addTimeBlocks(
      aiSuggestions.map((s) => {
        const matchedTask = allTasks.find((t) => t.title === s.taskTitle);
        return {
          title: s.taskTitle,
          startTime: `${dateStr} ${s.startTime}`,
          endTime: `${dateStr} ${s.endTime}`,
          taskId: matchedTask?.id,
        };
      }),
    );
    handleMenuChanged();
    setShowSuggestion(false);
    setAiSuggestions([]);
    setAiReasoning("");
    setUseAi(false);
    toast.success(`已写入 ${newBlocks.length} 个时间块（AI 规划）`);
  }

  // ===== 拖拽 handlers =====

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    setDraggingBlockId(id);
    // 找到被拖的时间块
    const block = getTimeBlocks().find((b) => b.id === id);
    setDraggingBlock(block ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setDraggingBlockId(null);
    setDraggingBlock(null);
    setHoverTarget(null);
    if (!over) return;
    const blockId = String(active.id);
    const targetId = String(over.id); // "day:yyyy-MM-dd" 或 "period:yyyy-MM-dd|idx"
    // 同位置无意义移动：直接 return，不弹 toast 不刷数据
    if (isSameLocation(blockId, targetId)) return;
    // 解析 target
    if (targetId.startsWith("day:")) {
      const newDate = targetId.slice(4);
      moveBlockToDate(blockId, newDate);
    } else if (targetId.startsWith("period:")) {
      // period:yyyy-MM-dd|periodIndex
      const rest = targetId.slice(7);
      const [newDate, periodIdxStr] = rest.split("|");
      const periodIdx = parseInt(periodIdxStr, 10);
      moveBlockToPeriod(blockId, newDate, periodIdx);
    }
  }

  // 检查拖到同位置（无意义移动）
  function isSameLocation(
    blockId: string,
    targetId: string,
  ): boolean {
    const blocks = getTimeBlocks();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return true;
    if (targetId.startsWith("day:")) {
      const newDate = targetId.slice(4);
      return extractDate(block.startTime) === newDate;
    }
    if (targetId.startsWith("period:")) {
      const rest = targetId.slice(7);
      const [newDate, periodIdxStr] = rest.split("|");
      const periodIdx = parseInt(periodIdxStr, 10);
      const periodTimes = getPeriodTimes();
      const periodList = Object.keys(periodTimes)
        .map((k) => parseInt(k, 10))
        .sort((a, b) => a - b);
      const period = periodList[periodIdx];
      if (period === undefined) return true;
      const [startH, startM] = periodTimes[period][0].split(":").map(Number);
      const targetMinutes = startH * 60 + startM;
      const currentMinutes =
        parseInt(block.startTime.split(" ")[1].split(":")[0], 10) * 60 +
        parseInt(block.startTime.split(" ")[1].split(":")[1], 10);
      return (
        extractDate(block.startTime) === newDate && currentMinutes === targetMinutes
      );
    }
    return false;
  }

  function moveBlockToDate(blockId: string, newDate: string) {
    const blocks = getTimeBlocks();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    // 计算新时段
    const oldStart = block.startTime.split(" ")[1];
    const oldEnd = block.endTime.split(" ")[1];
    const newStart = `${newDate} ${oldStart}`;
    const newEnd = `${newDate} ${oldEnd}`;
    // 冲突检测
    const conflicts = detectConflicts(newStart, newEnd, blockId);
    if (conflicts.length > 0) {
      const ok = window.confirm(
        `此时间与现有 ${conflicts.length} 个时间块重叠：\n${conflicts
          .map(
            (c) =>
              `  · ${c.title} (${c.startTime.split(" ")[1]}-${c.endTime.split(" ")[1]})`,
          )
          .join("\n")}\n\n仍要移动吗？`,
      );
      if (!ok) return;
    }
    moveTimeBlockToDate(blockId, newDate);
    setRefreshKey((k) => k + 1);
    toast.success(`已移动到 ${newDate.slice(5)}`);
  }

  function moveBlockToPeriod(blockId: string, newDate: string, periodIdx: number) {
    const blocks = getTimeBlocks();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    // 从节次时间表查新起始分钟
    const periodTimes = getPeriodTimes();
    const periodList = Object.keys(periodTimes)
      .map((k) => parseInt(k, 10))
      .sort((a, b) => a - b);
    const period = periodList[periodIdx];
    if (period === undefined) return;
    const [startH, startM] = periodTimes[period][0].split(":").map(Number);
    const newStartMinutes = startH * 60 + startM;
    // 计算时长
    const oldStartMinutes =
      parseInt(block.startTime.split(" ")[1].split(":")[0], 10) * 60 +
      parseInt(block.startTime.split(" ")[1].split(":")[1], 10);
    const oldEndMinutes =
      parseInt(block.endTime.split(" ")[1].split(":")[0], 10) * 60 +
      parseInt(block.endTime.split(" ")[1].split(":")[1], 10);
    const duration = oldEndMinutes - oldStartMinutes;
    const newEndMinutes = newStartMinutes + duration;
    if (newEndMinutes > 24 * 60) {
      toast.error("新时段超出当天范围");
      return;
    }
    const newStart = `${newDate} ${minutesToHHMM(newStartMinutes)}`;
    const newEnd = `${newDate} ${minutesToHHMM(newEndMinutes)}`;
    // 冲突检测
    const conflicts = detectConflicts(newStart, newEnd, blockId);
    if (conflicts.length > 0) {
      const ok = window.confirm(
        `此节次与现有 ${conflicts.length} 个时间块重叠：\n${conflicts
          .map(
            (c) =>
              `  · ${c.title} (${c.startTime.split(" ")[1]}-${c.endTime.split(" ")[1]})`,
          )
          .join("\n")}\n\n仍要移动吗？`,
      );
      if (!ok) return;
    }
    moveTimeBlockToTime(blockId, newDate, newStartMinutes);
    setRefreshKey((k) => k + 1);
    toast.success(`已移动到 ${periodTimes[period][0]} 节次`);
  }

  function minutesToHHMM(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  // ==================== 渲染 ====================

  // 整个日历页在挂载完成前不渲染拖拽相关 DOM（避免 SSR/CSR 的
  // dnd-kit useUniqueId 不一致触发 hydration error）。挂载完成后才插入
  // DndContext + DraggableTimeBlock / DroppableDayCell 等。
  if (!mounted) {
    return (
      <div className="space-y-5" suppressHydrationWarning>
        {/* 标题骨架，避免布局跳动 */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {format(new Date(2026, 8, 17), "yyyy 年 M 月", { locale: zhCN })}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              点击日期查看 / 添加备注
            </p>
          </div>
          <div className="h-9 w-40 rounded-full bg-muted/40" />
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDraggingBlockId(null);
        setDraggingBlock(null);
        setHoverTarget(null);
      }}
    >
      <div className="space-y-5">
        {/* 标题 + 视图切换 + 导航 */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {view === "month" &&
                format(currentDate, "yyyy 年 M 月", { locale: zhCN })}
              {view === "week" &&
                `${format(viewDays[0], "M 月 d 日", { locale: zhCN })} - ${format(
                  viewDays[6],
                  "M 月 d 日",
                  { locale: zhCN },
                )}`}
            {view === "day" && format(currentDate, "yyyy 年 M 月 d 日 EEEE", { locale: zhCN })}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            点击日期查看 / 添加备注
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 月/周/日切换 */}
          <div className="flex items-center rounded-full bg-muted/60 p-0.5">
            {viewTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setView(tab.key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  view === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* 月份/周/日 左右切换 */}
          <div className="flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5">
            <button
              onClick={() => navigate(-1)}
              aria-label="上一段"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                const t = new Date(2026, 8, 17);
                setCurrentDate(t);
                setSelectedDate(t);
              }}
              className="rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              今天
            </button>
            <button
              onClick={() => navigate(1)}
              aria-label="下一段"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:gap-5 lg:grid-cols-[1fr_320px]">
        {/* 主视图 */}
        <div>
          {view === "month" && (
            <MonthView
              viewDays={viewDays}
              currentDate={currentDate}
              selectedDate={selectedDate}
              eventsByDate={eventsByDate}
              onCellClick={handleCellClick}
              onEditTimeBlock={handleEditTimeBlock}
              refreshKey={refreshKey}
              apiHolidayEntries={apiHolidayEntries}
              draggingBlockId={draggingBlockId}
            />
          )}
          {view === "week" && (
            <WeekView
              viewDays={viewDays}
              currentDate={currentDate}
              selectedDate={selectedDate}
              onCellClick={handleCellClick}
              onAddTimeBlock={handleAddTimeBlock}
              onEditTimeBlock={handleEditTimeBlock}
              refreshKey={refreshKey}
              draggingBlockId={draggingBlockId}
            />
          )}
          {view === "day" && (
            <DayView
              date={currentDate}
              selectedDate={selectedDate}
              onCellClick={handleCellClick}
              onAddTimeBlock={handleAddTimeBlock}
              onEditTimeBlock={handleEditTimeBlock}
              refreshKey={refreshKey}
              draggingBlockId={draggingBlockId}
            />
          )}
        </div>

        {/* 侧栏 */}
        <div className="rounded-2xl bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {selectedDate
                  ? format(selectedDate, "EEEE", { locale: zhCN })
                  : ""}
              </p>
              <h3 className="text-lg font-bold">
                {selectedDate
                  ? format(selectedDate, "M 月 d 日", { locale: zhCN })
                  : "未选择"}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedDayNote?.starred && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Star className="h-3 w-3 fill-primary" /> 重点
                </span>
              )}
              {selectedDate && isHoliday(selectedDate) && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {isHoliday(selectedDate)?.name}
                </span>
              )}
            </div>
          </div>

          {/* 当天备注 */}
          {selectedDate && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <NotebookPen className="h-3 w-3" /> 当天备注
                </h4>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleToggleStar}
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                      selectedDayNote?.starred
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                    aria-label="切换重点标注"
                    title={selectedDayNote?.starred ? "取消重点" : "标为重点"}
                  >
                    <Star
                      className={cn(
                        "h-3.5 w-3.5",
                        selectedDayNote?.starred && "fill-primary",
                      )}
                    />
                  </button>
                  {!editingNote && (
                    <button
                      onClick={handleStartEditNote}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                      aria-label="编辑备注"
                      title="编辑"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {editingNote ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="写点备注……"
                    rows={4}
                    className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  />
                  <div className="flex items-center justify-between">
                    {selectedDayNote?.note ? (
                      <button
                        onClick={handleDeleteNote}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" /> 删除
                      </button>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setNoteDraft(selectedDayNote?.note ?? "");
                          setEditingNote(false);
                        }}
                        className="rounded-full px-3 py-1 text-xs text-muted-foreground hover:bg-muted"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSaveNote}
                        className="rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                </div>
              ) : selectedDayNote?.note ? (
                <p className="rounded-lg bg-muted/30 px-3 py-2.5 text-sm leading-relaxed">
                  {selectedDayNote.note}
                </p>
              ) : (
                <button
                  onClick={handleStartEditNote}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-4 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> 添加备注
                </button>
              )}
            </div>
          )}

          {/* 当天课程 */}
          {selectedDayCourses.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                当天课程（{selectedDayCourses.length}）
              </h4>
              <div className="space-y-1.5">
                {selectedDayCourses.map(({ session, course }) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                    style={{
                      backgroundColor: `${course!.color}10`,
                      borderLeft: `3px solid ${course!.color}`,
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-medium"
                        style={{ color: course!.color }}
                      >
                        {course!.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        第{session.periodStart}-{session.periodEnd}节 ·{" "}
                        {session.startTime}-{session.endTime}
                        {session.classroom && ` · ${session.classroom}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 当天时间块 */}
          {selectedDayTimeBlocks.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>时间块（{selectedDayTimeBlocks.length}）</span>
              </h4>
              <div className="space-y-1.5">
                {selectedDayTimeBlocks.map((tb) => {
                  const startTime = tb.startTime.split(" ")[1] ?? "";
                  const endTime = tb.endTime.split(" ")[1] ?? "";
                  const linkedTask = tb.linkedTask;
                  return (
                    <div
                      key={tb.id}
                      className={cn(
                        "group flex items-start gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-muted/50",
                        linkedTask
                          ? "bg-primary/5 ring-1 ring-primary/15"
                          : "bg-muted/30",
                      )}
                    >
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {tb.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {startTime} - {endTime}
                        </p>
                        {/* 关联任务信息 */}
                        {linkedTask && (
                          <a
                            href={`/tasks?focus=${linkedTask.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 flex items-center gap-1.5 rounded bg-background/60 px-1.5 py-1 text-[11px] hover:bg-background"
                            title={`跳转到任务：${linkedTask.title}`}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full",
                                priorityDot[linkedTask.priority],
                              )}
                            />
                            <span className="truncate text-foreground/80">
                              {linkedTask.title}
                            </span>
                            <span
                              className={cn(
                                "ml-auto shrink-0 text-[10px]",
                                linkedTask.status === "done"
                                  ? "text-primary"
                                  : linkedTask.status === "in_progress"
                                    ? "text-[#A45C3D]"
                                    : "text-muted-foreground/60",
                              )}
                            >
                              {linkedTask.status === "done"
                                ? "✓"
                                : linkedTask.status === "in_progress"
                                  ? "进行中"
                                  : "待办"}
                            </span>
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => handleEditTimeBlock(tb)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
                        title="编辑"
                        aria-label="编辑时间块"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 当天事件（任务/时间块等 mock 数据）*/}
          {selectedEvents.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                任务 / 时间块
              </h4>
              <div className="space-y-1.5">
                {selectedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: ev.color }}
                    />
                    <span className="flex-1 truncate text-sm font-medium">
                      {ev.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {ev.type === "exam"
                        ? "考试"
                        : ev.type === "time-block"
                          ? "时间块"
                          : "任务"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 智能排程建议 */}
          {showSuggestion && (
            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />{" "}
                {useAi ? "AI 智能排程建议" : "本地规则排程建议"}
              </div>
              {aiReasoning && (
                <p className="mb-2 rounded bg-background/60 px-2 py-1.5 text-[11px] text-foreground/80">
                  {aiReasoning}
                </p>
              )}
              {(useAi ? aiSuggestions : suggestions).length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  今日没有空闲时段可安排
                </p>
              ) : (
                <div className="space-y-1">
                  {(useAi ? aiSuggestions : suggestions).map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">
                        {s.startTime}-{s.endTime}
                      </span>
                      <span className="flex-1 truncate">{s.taskTitle}</span>
                      <span className="text-muted-foreground/60">
                        {s.duration}分
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <button
                  onClick={() => {
                    setShowSuggestion(false);
                    setAiSuggestions([]);
                    setAiReasoning("");
                    setUseAi(false);
                  }}
                  className="rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                >
                  取消
                </button>
                <button
                  onClick={
                    useAi ? handleConfirmAiSuggestion : handleConfirmSuggestion
                  }
                  disabled={
                    (useAi ? aiSuggestions : suggestions).length === 0
                  }
                  className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                >
                  一键写入
                </button>
              </div>
            </div>
          )}

          {selectedDate &&
            !selectedDayNote?.note &&
            selectedEvents.length === 0 &&
            selectedDayCourses.length === 0 &&
            selectedDayTimeBlocks.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">这一天很安静</p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  休息也是学习的一部分
                </p>
              </div>
            )}

          <div className="flex flex-col gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowSuggestion((v) => !v);
                setUseAi(false);
              }}
              className="w-full gap-1.5"
            >
              <Sparkles className="h-4 w-4" />
              {showSuggestion && !useAi ? "隐藏排程建议" : "本地规则排程"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAiSchedule}
              disabled={aiLoading || !selectedDate}
              className="w-full gap-1.5 text-muted-foreground"
              title="使用 AI（需在设置页配置 API Key）"
            >
              <Bot className="h-4 w-4" />
              {aiLoading ? "AI 思考中…" : "AI 智能排程"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                selectedDate && handleAddTimeBlock(dateKey(selectedDate))
              }
              className="w-full gap-1.5 text-muted-foreground"
            >
              <Plus className="h-4 w-4" /> 添加时间块
            </Button>
          </div>
        </div>
      </div>

      {/* 日期操作菜单 */}
      {menuDate && (
        <DayMenu
          date={dateKey(menuDate)}
          dateLabel={dateLabelCN(menuDate)}
          open={menuOpen}
          anchorEl={menuAnchor}
          onClose={() => setMenuOpen(false)}
          onChanged={handleMenuChanged}
        />
      )}

      {/* 时间块创建/编辑表单 */}
      <TimeBlockDialog
        open={tbDialogOpen}
        block={editingTimeBlock}
        date={tbDialogDate}
        startTime={tbDialogStart}
        endTime={tbDialogEnd}
        onClose={() => {
          setTbDialogOpen(false);
          setEditingTimeBlock(null);
        }}
        onSaved={handleMenuChanged}
      />

      {/* 拖拽预览（跟随鼠标） */}
      <DragOverlay dropAnimation={null}>
        {draggingBlock ? (
          <div
            className="rounded-md bg-[#8B7355] px-2 py-1 text-[11px] leading-tight text-white shadow-lg ring-2 ring-[#8B7355]/40"
            style={{ minWidth: 120 }}
          >
            <div className="font-medium">{draggingBlock.title}</div>
            <div className="opacity-90">
              {draggingBlock.startTime.split(" ")[1]} -{" "}
              {draggingBlock.endTime.split(" ")[1]}
            </div>
          </div>
        ) : null}
      </DragOverlay>
      </div>
    </DndContext>
  );
}

// ==================== 拖拽子组件 ====================

/** 可放置目标：日历日期格 */
/**
 * 仅在挂载后渲染的可放置/可拖拽组件的 hook：
 * dnd-kit 的 useUniqueId 在 SSR/CSR 会生成不同 ID，导致 hydration error。
 */
function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

function DroppableDayCell({
  date,
  inMonth,
  selected,
  isHoliday,
  dayNoteStarred,
  onClick,
  children,
}: {
  date: string;
  inMonth: boolean;
  selected: boolean;
  isHoliday: boolean;
  dayNoteStarred: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  const mounted = useIsMounted();
  // 未挂载时用普通 div，避免 dnd-kit 的 useDroppable 影响 SSR
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (mounted) setEnabled(true);
  }, [mounted]);
  const { isOver, setNodeRef } = useDroppable({
    id: `day:${date}`,
    disabled: !enabled,
  });
  return (
    <div
      ref={enabled ? setNodeRef : undefined}
      role="button"
      tabIndex={0}
      onClick={(e) => onClick(e as unknown as React.MouseEvent<HTMLButtonElement>)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }
      }}
      className={cn(
        "group relative flex min-h-[78px] flex-col items-start gap-1 rounded-lg p-1.5 text-left transition-colors sm:min-h-[100px] sm:p-2",
        selected && !isHoliday && "bg-primary/5",
        selected && isHoliday && "bg-muted/60",
        !selected && !isHoliday && "hover:bg-muted/50",
        !selected && isHoliday && "hover:bg-muted/30",
        !inMonth && "opacity-30",
        isHoliday && "bg-muted/40",
        dayNoteStarred && "ring-1 ring-primary/30",
        enabled && isOver && "ring-2 ring-primary bg-primary/10",
      )}
    >
      {children}
    </div>
  );
}

/** 可拖动时间块 */
function DraggableTimeBlock({
  id,
  isDragging,
  onClick,
  title,
}: {
  id: string;
  isDragging: boolean;
  onClick: () => void;
  title: string;
}) {
  const mounted = useIsMounted();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (mounted) setEnabled(true);
  }, [mounted]);
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    disabled: !enabled,
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1, // 拖动中原件淡出，由 DragOverlay 显示预览
    cursor: enabled ? "grab" : "default",
    touchAction: enabled ? "none" : "auto",
    backgroundColor: "#8B735515",
  };
  return (
    <div
      ref={enabled ? setNodeRef : undefined}
      style={style}
      {...(enabled ? listeners : {})}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight transition-colors hover:bg-[#8B735525]"
      title="拖动移动到其他日期 · 点击编辑"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B7355]" />
      <span className="truncate text-[#8B7355]">{title}</span>
    </div>
  );
}

/** 可放置目标：周视图时间块行单元格 */
function WeekDroppable({
  date,
  onClick,
  title,
  children,
}: {
  date: string;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const mounted = useIsMounted();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (mounted) setEnabled(true);
  }, [mounted]);
  const { isOver, setNodeRef } = useDroppable({
    id: `day:${date}`,
    disabled: !enabled,
  });
  return (
    <div
      ref={enabled ? setNodeRef : undefined}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      title={title}
      className={cn(
        "group flex min-h-[40px] flex-col gap-0.5 border-l px-1.5 py-1 text-left transition-colors hover:bg-muted/40",
        enabled && isOver && "bg-primary/10 ring-1 ring-primary/30",
      )}
    >
      {children}
    </div>
  );
}

/** 可放置目标：周视图节次格（接受拖拽到具体节次，自动重排起止时间） */
function PeriodDroppable({
  date,
  periodIdx,
  hasCourse,
  onClick,
  children,
}: {
  date: string;
  periodIdx: number;
  hasCourse: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  const mounted = useIsMounted();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (mounted) setEnabled(true);
  }, [mounted]);
  const { isOver, setNodeRef } = useDroppable({
    id: `period:${date}|${periodIdx}`,
    disabled: !enabled,
  });
  return (
    <button
      ref={enabled ? (setNodeRef as unknown as React.Ref<HTMLButtonElement>) : undefined}
      type="button"
      onClick={onClick}
      title={hasCourse ? "点击查看当日操作 · 可拖时间块到此节次" : "点击查看当日操作 · 可拖时间块到此节次"}
      className={cn(
        "relative min-h-[52px] border-l px-1 py-1 text-left transition-colors hover:bg-muted/40",
        enabled && isOver && "bg-primary/15 ring-2 ring-primary/40",
      )}
    >
      {children}
    </button>
  );
}

/** 可放置目标：日视图节次行（接受拖拽到具体节次） */
function DayPeriodDroppable({
  date,
  periodIdx,
  hasCourse,
  onClick,
  children,
}: {
  date: string;
  periodIdx: number;
  hasCourse: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}) {
  const mounted = useIsMounted();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (mounted) setEnabled(true);
  }, [mounted]);
  const { isOver, setNodeRef } = useDroppable({
    id: `period:${date}|${periodIdx}`,
    disabled: !enabled,
  });
  return (
    <button
      ref={enabled ? (setNodeRef as unknown as React.Ref<HTMLButtonElement>) : undefined}
      type="button"
      onClick={onClick}
      title="点击查看当日操作 · 可拖时间块到此节次"
      className={cn(
        "min-h-[56px] rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/40",
        enabled && isOver && "bg-primary/15 ring-2 ring-primary/40",
      )}
    >
      {children}
    </button>
  );
}

/** 可放置目标：日视图时间块区域 */
function DayDroppable({
  date,
  children,
}: {
  date: string;
  children: React.ReactNode;
}) {
  const mounted = useIsMounted();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (mounted) setEnabled(true);
  }, [mounted]);
  const { isOver, setNodeRef } = useDroppable({
    id: `day:${date}`,
    disabled: !enabled,
  });
  return (
    <div
      ref={enabled ? setNodeRef : undefined}
      className={cn(
        "min-h-[60px] rounded-lg transition-colors",
        enabled && isOver && "bg-primary/10 ring-2 ring-primary/40",
      )}
    >
      {children}
    </div>
  );
}

// ==================== 月视图 ====================

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  color: string;
  type: "task" | "time-block" | "exam";
  priority?: string;
  urgency?: "normal" | "today" | "overdue";
  done?: boolean;
}

interface MonthViewProps {
  viewDays: Date[];
  currentDate: Date;
  selectedDate: Date | null;
  eventsByDate: Map<string, CalendarEvent[]>;
  onCellClick: (day: Date, e: React.MouseEvent<HTMLButtonElement>) => void;
  onEditTimeBlock: (tb: TimeBlock) => void;
  refreshKey: number;
  apiHolidayEntries: ApiCalendarEntry[];
  draggingBlockId: string | null;
}

function MonthView({
  viewDays,
  currentDate,
  selectedDate,
  eventsByDate,
  onCellClick,
  onEditTimeBlock,
  refreshKey,
  apiHolidayEntries,
  draggingBlockId,
}: MonthViewProps) {
  return (
    <div>
      <div className="grid grid-cols-7 border-b pb-2">
        {weekDays.map((d, i) => (
          <div
            key={d}
            className={cn(
              "text-center text-xs font-medium",
              i === 0 || i === 6
                ? "text-muted-foreground/60"
                : "text-muted-foreground",
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {viewDays.map((day) => {
          const dateStr = dateKey(day);
          const events = eventsByDate.get(dateStr) ?? [];
          const hasClass = hasClassOnDate(day);
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const dayNote = getDayNote(dateStr);
          const timeBlocks = getTimeBlocksForDate(dateStr);

          // 多状态判定：法定节假日 > 用户假期 > 调休工作日 > 普通周末/工作日
          const dayStatus = getMergedDayStatus(day, [], apiHolidayEntries);
          const statusType = dayStatus.type;
          const statusName = dayStatus.name;
          // 法定节假日 / 用户假期 → 休息（红/灰底）
          // 调休工作日 → 视为"工作日"，显示"班"标记（绿色）
          // 周末 → 灰色"休"
          // 普通工作日 → 无标记
          const isHoliday = statusType === "holiday";
          const isMakeupWorkday =
            statusType === "workday" && dayStatus.source === "official";
          const isWeekend = statusType === "weekend";
          const isRestDay = isHoliday || isWeekend;

          return (
            <DroppableDayCell
              key={dateStr}
              date={dateStr}
              inMonth={inMonth}
              selected={!!selected}
              isHoliday={isHoliday}
              dayNoteStarred={!!dayNote?.starred}
              onClick={(e) => onCellClick(day, e)}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                      today
                        ? "bg-primary text-primary-foreground"
                        : isHoliday
                          ? "text-muted-foreground/70"
                          : isRestDay
                            ? "text-muted-foreground/80"
                            : "text-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayNote?.starred && (
                    <Star className="h-3 w-3 fill-primary text-primary" />
                  )}
                  {dayNote?.note && !dayNote.starred && (
                    <NotebookPen className="h-3 w-3 text-muted-foreground/60" />
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {isHoliday && statusName && (
                    <span className="rounded-full bg-[#A45C3D]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#A45C3D]">
                      {statusName}
                    </span>
                  )}
                  {!isHoliday && isMakeupWorkday && statusName && (
                    <span className="rounded-full bg-[#5C8A6B]/15 px-1.5 py-0.5 text-[9px] font-medium text-[#5C8A6B]">
                      班
                    </span>
                  )}
                  {!isHoliday && !isMakeupWorkday && isWeekend && inMonth && (
                    <span className="text-[9px] text-muted-foreground/60">
                      休
                    </span>
                  )}
                  {!isHoliday && !isWeekend && !hasClass && inMonth && (
                    <span className="text-[9px] text-muted-foreground/50">
                      无课
                    </span>
                  )}
                </div>
              </div>

              {dayNote?.note && (
                <div className="line-clamp-1 w-full rounded bg-primary/5 px-1.5 py-0.5 text-[11px] leading-tight text-foreground/80">
                  {dayNote.note}
                </div>
              )}

              <div className="flex w-full flex-col gap-0.5">
                {/* 课程块 */}
                {hasClass && (
                  <div
                    className="flex items-center gap-1 rounded px-1 py-0.5 text-[11px] leading-tight"
                    style={{ backgroundColor: "#5C8A6B15" }}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#5C8A6B]" />
                    <span className="truncate text-[#5C8A6B]">有课</span>
                  </div>
                )}
                {/* 时间块 */}
                {timeBlocks.slice(0, 1).map((tb) => (
                  <DraggableTimeBlock
                    key={tb.id}
                    id={tb.id}
                    isDragging={draggingBlockId === tb.id}
                    onClick={() => onEditTimeBlock(tb)}
                    title={tb.title}
                  />
                ))}
                {/* 任务/事件 */}
                {events.slice(0, hasClass || timeBlocks.length > 0 ? 2 : 3).map(
                  (ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[11px] leading-tight"
                      style={{ backgroundColor: `${ev.color}15` }}
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: ev.color }}
                      />
                      <span
                        className="truncate"
                        style={{ color: ev.color }}
                      >
                        {ev.title}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </DroppableDayCell>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 周视图 ====================

interface WeekViewProps {
  viewDays: Date[];
  currentDate: Date;
  selectedDate: Date | null;
  onCellClick: (day: Date, e: React.MouseEvent<HTMLButtonElement>) => void;
  onAddTimeBlock: (date: string, start?: string, end?: string) => void;
  onEditTimeBlock: (tb: TimeBlock) => void;
  refreshKey: number;
  draggingBlockId: string | null;
}

function WeekView({
  viewDays,
  selectedDate,
  onCellClick,
  onAddTimeBlock,
  onEditTimeBlock,
  draggingBlockId,
}: WeekViewProps) {
  const periodTimes = getPeriodTimes();
  const periodList = Object.keys(periodTimes)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);
  const courses = getCourses();

  return (
    <div className="rounded-2xl bg-card p-3 shadow-sm">
      {/* 列头：日期 + 周几 */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b pb-2">
        <div className="text-center text-[10px] text-muted-foreground">节次</div>
        {viewDays.map((day) => {
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;
          const holiday = isHoliday(day);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const restDay = isWeekend || !!holiday;
          return (
            <div
              key={dateKey(day)}
              className="flex flex-col items-center gap-0.5 border-l px-1 py-1.5"
            >
              <span
                className={cn(
                  "text-[10px]",
                  restDay ? "text-muted-foreground/60" : "text-muted-foreground",
                )}
              >
                {weekDays[day.getDay()]}
              </span>
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  today
                    ? "bg-primary text-primary-foreground"
                    : restDay
                      ? "text-muted-foreground/70"
                      : "text-foreground",
                  selected && "ring-1 ring-primary",
                )}
              >
                {format(day, "d")}
              </span>
              {holiday && (
                <span className="text-[9px] text-muted-foreground">
                  {holiday.name}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 节次行 */}
      <div className="divide-y">
        {periodList.map((period, periodIdx) => {
          const timeText = periodTimes[period];
          return (
            <div
              key={period}
              className="grid grid-cols-[60px_repeat(7,1fr)] items-stretch"
            >
              {/* 节次标 */}
              <div className="flex flex-col items-center justify-center bg-muted/10 py-2 text-center">
                <span className="text-sm font-semibold">{period}</span>
                <span className="text-[9px] text-muted-foreground">
                  {timeText?.[0]}
                </span>
              </div>
              {/* 各天 */}
              {viewDays.map((day) => {
                const dateStr = dateKey(day);
                const cellSessions = getSessions().filter(
                  (s) => s.weekday === day.getDay() && s.periodStart === period,
                );
                const courseForSession = cellSessions
                  .map((s) => ({
                    session: s,
                    course: courses.find((c) => c.id === s.courseId),
                  }))
                  .filter((x) => x.course);

                return (
                  <PeriodDroppable
                    key={dateStr}
                    date={dateStr}
                    periodIdx={periodIdx}
                    hasCourse={courseForSession.length > 0}
                    onClick={(e) =>
                      onCellClick(day, e as unknown as React.MouseEvent<HTMLButtonElement>)
                    }
                  >
                    {courseForSession.map(({ session, course }) => (
                      <div
                        key={session.id}
                        className="rounded px-1.5 py-1 text-[10px] leading-tight"
                        style={{
                          backgroundColor: `${course!.color}20`,
                          borderLeft: `2px solid ${course!.color}`,
                        }}
                      >
                        <div
                          className="truncate font-medium"
                          style={{ color: course!.color }}
                        >
                          {course!.name}
                        </div>
                        {session.classroom && (
                          <div className="truncate text-muted-foreground/70">
                            @ {session.classroom}
                          </div>
                        )}
                      </div>
                    ))}
                  </PeriodDroppable>
                );
              })}
            </div>
          );
        })}

        {/* 时间块行 */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] items-stretch bg-muted/5">
          <div className="flex flex-col items-center justify-center py-2 text-center">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">自由</span>
          </div>
          {viewDays.map((day) => {
            const dateStr = dateKey(day);
            const tbs = getTimeBlocksForDate(dateStr);
            return (
              <WeekDroppable
                key={dateStr}
                date={dateStr}
                onClick={() => onAddTimeBlock(dateStr)}
                title="点击添加时间块"
              >
                {tbs.map((tb) => (
                  <DraggableTimeBlock
                    key={tb.id}
                    id={tb.id}
                    isDragging={draggingBlockId === tb.id}
                    onClick={() => onEditTimeBlock(tb)}
                    title={tb.title}
                  />
                ))}
                {tbs.length === 0 && (
                  <span className="hidden text-[10px] text-muted-foreground/40 group-hover:inline">
                    + 点击添加
                  </span>
                )}
              </WeekDroppable>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== 日视图 ====================

interface DayViewProps {
  date: Date;
  selectedDate: Date | null;
  onCellClick: (day: Date, e: React.MouseEvent<HTMLButtonElement>) => void;
  onAddTimeBlock: (date: string, start?: string, end?: string) => void;
  onEditTimeBlock: (tb: TimeBlock) => void;
  refreshKey: number;
  draggingBlockId: string | null;
}

function DayView({
  date,
  selectedDate,
  onCellClick,
  onAddTimeBlock,
  onEditTimeBlock,
  draggingBlockId,
}: DayViewProps) {
  const periodTimes = getPeriodTimes();
  const periodList = Object.keys(periodTimes)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);
  const courses = getCourses();
  const dateStr = dateKey(date);
  const weekday = date.getDay();
  const daySessions = getSessions().filter((s) => s.weekday === weekday);
  const timeBlocks = getTimeBlocksForDate(dateStr);
  const isWeekend = weekday === 0 || weekday === 6;
  const holiday = isHoliday(date);
  const restDay = isWeekend || !!holiday;

  return (
    <div className="rounded-2xl bg-card p-4 shadow-sm">
      <div className="grid grid-cols-[60px_1fr] divide-y">
        {periodList.map((period, periodIdx) => {
          const timeText = periodTimes[period];
          const cellSessions = daySessions.filter(
            (s) => s.periodStart === period,
          );
          const coursesAtPeriod = cellSessions
            .map((s) => ({
              session: s,
              course: courses.find((c) => c.id === s.courseId),
            }))
            .filter((x) => x.course);

          return (
            <div
              key={period}
              className="grid grid-cols-[60px_1fr] py-2 first:pt-0 last:pb-0"
            >
              {/* 节次标 */}
              <div className="flex flex-col items-center justify-start pt-1 text-center">
                <span className="text-sm font-semibold">{period}</span>
                <span className="text-[10px] text-muted-foreground">
                  {timeText?.[0]}
                </span>
                <span className="text-[9px] text-muted-foreground/60">
                  {timeText?.[1]}
                </span>
              </div>
              {/* 内容 */}
              <DayPeriodDroppable
                date={dateStr}
                periodIdx={periodIdx}
                hasCourse={coursesAtPeriod.length > 0}
                onClick={(e) => onCellClick(date, e)}
              >
                {coursesAtPeriod.length === 0 ? (
                  <span className="text-xs text-muted-foreground/40">空闲</span>
                ) : (
                  <div className="space-y-1">
                    {coursesAtPeriod.map(({ session, course }) => (
                      <div
                        key={session.id}
                        className="rounded-lg px-3 py-2"
                        style={{
                          backgroundColor: `${course!.color}15`,
                          borderLeft: `3px solid ${course!.color}`,
                        }}
                      >
                        <p
                          className="font-medium"
                          style={{ color: course!.color }}
                        >
                          {course!.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {session.startTime}-{session.endTime}
                          {session.classroom && ` · ${session.classroom}`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </DayPeriodDroppable>
            </div>
          );
        })}

        {/* 时间块分隔 */}
        <div className="grid grid-cols-[60px_1fr] py-2">
          <div className="flex flex-col items-center justify-start pt-1 text-center">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">自由</span>
          </div>
          <DayDroppable date={dateStr}>
            <div className="space-y-1 px-1">
              {timeBlocks.map((tb) => (
                <DraggableTimeBlock
                  key={tb.id}
                  id={tb.id}
                  isDragging={draggingBlockId === tb.id}
                  onClick={() => onEditTimeBlock(tb)}
                  title={`${tb.startTime.split(" ")[1]} ${tb.title}`}
                />
              ))}
              <button
                onClick={() => onAddTimeBlock(dateStr)}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30 hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> 添加时间块
              </button>
            </div>
          </DayDroppable>
        </div>

        {/* 备注展示 */}
        <div className="grid grid-cols-[60px_1fr] py-2">
          <div className="flex flex-col items-center justify-start pt-1 text-center">
            <NotebookPen className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">备注</span>
          </div>
          <div className="px-1">
            {(() => {
              const note = getDayNote(dateStr);
              if (!note?.note && !note?.starred) {
                return (
                  <p className="rounded-lg border border-dashed py-4 text-center text-xs text-muted-foreground/60">
                    这一天没有备注
                  </p>
                );
              }
              return (
                <div
                  className={cn(
                    "rounded-lg px-3 py-2.5",
                    note.starred && "bg-primary/5 ring-1 ring-primary/30",
                    !note.starred && "bg-muted/30",
                  )}
                >
                  {note.starred && (
                    <div className="mb-1 flex items-center gap-1 text-xs font-medium text-primary">
                      <Star className="h-3 w-3 fill-primary" /> 重点日
                    </div>
                  )}
                  {note.note && (
                    <p className="text-sm leading-relaxed">{note.note}</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
