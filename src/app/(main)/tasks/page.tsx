"use client";

import { useState, useMemo, useEffect } from "react";
import { format, parseISO, isToday, isTomorrow, isThisWeek } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
  Clock,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getTasks,
  removeTask,
  removeTasks,
  updateTasksStatus,
  type Task,
} from "@/lib/tasks";
import { getCategories } from "@/lib/categories";
import type { Priority, Status } from "@/lib/mock-data";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getDueStatus,
  dueStatusLabel,
  dueStatusColor,
  dueStatusOrder,
  daysOverdue,
} from "@/lib/task-due";

const priorityDot: Record<Priority, string> = {
  high: "bg-[#A45C3D]",
  medium: "bg-[#8B9D6B]",
  low: "bg-[#7C8471]",
};

const statusFilters: { key: Status | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "todo", label: "待办" },
  { key: "in_progress", label: "进行中" },
  { key: "done", label: "已完成" },
];

function getDateBucket(dateStr?: string): string {
  if (!dateStr) return "无截止日";
  const d = parseISO(dateStr);
  if (isToday(d)) return "今天";
  if (isTomorrow(d)) return "明天";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "本周";
  return "之后";
}

const bucketOrder = ["今天", "明天", "本周", "之后", "无截止日"];

export default function TasksPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

  // 读 URL 参数：?date=xxx 用于预填，?focus=xxx 用于从日历跳转后高亮任务
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const date = params.get("date");
    const focus = params.get("focus");
    if (date) {
      setEditingTask(null);
      setDialogOpen(true);
      // 预填逻辑在 TaskDialog 内部处理
    }
    if (focus) {
      setFocusedTaskId(focus);
      // 滚动到目标任务位置
      setTimeout(() => {
        document
          .getElementById(`task-row-${focus}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      // 3 秒后清除高亮（不立刻清除，给用户时间看清）
      setTimeout(() => setFocusedTaskId(null), 3000);
    }
  }, []);

  // 全局快捷键：Cmd/Ctrl+N 新建任务，Cmd/Ctrl+F 聚焦搜索
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      // Cmd/Ctrl + N：新建任务（即使在 input 里也允许，e.g. 在搜索框点新建）
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNew();
        return;
      }
      // Cmd/Ctrl + F：聚焦搜索（避免与浏览器原生冲突）
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        document
          .getElementById("task-search-input")
          ?.dispatchEvent(new MouseEvent("click"));
        const el = document.getElementById("task-search-input") as HTMLInputElement | null;
        el?.focus();
        return;
      }
      // Escape：清空搜索
      if (e.key === "Escape" && !inField) {
        if (search) setSearch("");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const tasks = useMemo(() => {
    // refreshKey 触发重新读取
    return getTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // 分类映射（id/名称 → 颜色）—— 每次渲染时调一次（categories 列表小，性能可忽略）
  const categoryMap = (() => {
    const map = new Map<string, string>();
    for (const c of getCategories()) {
      map.set(c.id, c.color);
      map.set(c.name, c.color);
    }
    return map;
  })();

  const filtered = useMemo(() => {
    return tasks
      .filter((t) => statusFilter === "all" || t.status === statusFilter)
      .filter(
        (t) =>
          !search ||
          t.title.includes(search) ||
          t.category.includes(search) ||
          t.tags.some((tag) => tag.includes(search)),
      );
    // refreshKey 触发重算
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, statusFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    // 已完成的任务保留原"今天/明天/本周/之后"分组（用户想找过去完成过什么）
    // 未完成的任务改用 dueStatusOrder 排序（逾期 → 今天 → 明天 → 本周 → 之后 → 无截止日）
    for (const t of filtered) {
      let bucket: string;
      if (t.status === "done") {
        bucket = getDateBucket(t.dueDate);
      } else {
        const dueKey = getDueStatus(t.dueDate);
        bucket = dueStatusLabel[dueKey];
      }
      const list = map.get(bucket) ?? [];
      list.push(t);
      map.set(bucket, list);
    }
    // 渲染顺序
    const activeOrder = ["逾期", "今天", "明天", "本周", "之后", "无截止日"];
    return activeOrder
      .filter((b) => map.has(b))
      .map((b) => ({ bucket: b, tasks: map.get(b)! }));
  }, [filtered]);

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

// 紧急计数（仅未完成）
const urgentCounts = useMemo(() => {
    let overdue = 0,
    today = 0,
    tomorrow = 0;
    for (const t of tasks) {
      if (t.status === "done") continue;
      const s = getDueStatus(t.dueDate);
      if (s === "overdue") overdue++;
      else if (s === "today") today++;
      else if (s === "tomorrow") tomorrow++;
    }
    return { overdue, today, tomorrow };
  }, [tasks]);

  function handleSaved() {
    setRefreshKey((k) => k + 1);
    setSelectedIds(new Set());
  }

  function handleDelete(id: string) {
    if (!confirm("确认删除此任务？")) return;
    removeTask(id);
    handleSaved();
    toast.success("任务已删除");
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBatchDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`确认删除选中的 ${selectedIds.size} 个任务？`)) return;
    removeTasks(Array.from(selectedIds));
    handleSaved();
    toast.success(`已删除 ${selectedIds.size} 个任务`);
  }

  function handleBatchComplete() {
    if (selectedIds.size === 0) return;
    updateTasksStatus(Array.from(selectedIds), "done");
    handleSaved();
    toast.success(`已标记 ${selectedIds.size} 个任务为完成`);
  }

  function handleEdit(task: Task) {
    setEditingTask(task);
    setDialogOpen(true);
  }

  function handleNew() {
    setEditingTask(null);
    setDialogOpen(true);
  }

  // URL 参数预填日期
  const presetDate = (() => {
    if (typeof window === "undefined") return undefined;
    return new URLSearchParams(window.location.search).get("date") ?? undefined;
  })();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">任务清单</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            共 {counts.all} 项 · 待办 {counts.todo} · 进行中 {counts.in_progress} · 已完成 {counts.done}
          </p>
          {(urgentCounts.overdue > 0 ||
            urgentCounts.today > 0 ||
            urgentCounts.tomorrow > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              {urgentCounts.overdue > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 font-medium text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {urgentCounts.overdue} 个逾期
                </span>
              )}
              {urgentCounts.today > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#A45C3D]/10 px-2.5 py-0.5 font-medium text-[#A45C3D]">
                  <Clock className="h-3 w-3" />
                  {urgentCounts.today} 个今日到期
                </span>
              )}
              {urgentCounts.tomorrow > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground">
                  <CalendarDays className="h-3 w-3" />
                  {urgentCounts.tomorrow} 个明日到期
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBatchComplete}
                className="gap-1.5 text-primary"
              >
                <CheckSquare className="h-4 w-4" /> 标记完成 ({selectedIds.size})
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBatchDelete}
                className="gap-1.5 text-destructive"
              >
                <Trash2 className="h-4 w-4" /> 删除 ({selectedIds.size})
              </Button>
            </>
          )}
          <Button size="sm" onClick={handleNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> 新建
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-0 flex-1 sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            id="task-search-input"
            placeholder="搜索任务... (⌘F)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full border-none bg-muted/60 pl-10 focus-visible:bg-background"
          />
        </div>
        <div className="flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5">
          {statusFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                statusFilter === f.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              <span className="ml-1 opacity-50">
                {counts[f.key as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {grouped.length === 0 ? (
          search || statusFilter !== "all" ? (
            <EmptyState
              icon={<Search className="h-6 w-6" />}
              title="没有符合条件的任务"
              description={
                search
                  ? `搜索 "${search}" 没有匹配项，试试别的关键词？`
                  : "当前筛选下没有任务，换个状态看看？"
              }
              secondary={{
                label: "清除筛选",
                onClick: () => {
                  setSearch("");
                  setStatusFilter("all");
                },
              }}
            />
          ) : (
            <EmptyState
              icon={<CheckSquare className="h-6 w-6" />}
              title="还没有任务"
              description="把要学的内容拆成小任务，逐个完成会更有节奏。也可以从日历页面直接添加。"
              primary={{
                label: "新建第一个任务",
                onClick: handleNew,
              }}
              secondary={{ label: "打开日历", href: "/calendar" }}
            />
          )
        ) : (
          grouped.map(({ bucket, tasks }) => (
            <div key={bucket}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {bucket}
                </h2>
                <span className="text-xs text-muted-foreground/50">
                  {tasks.length}
                </span>
                <div className="ml-2 h-px flex-1 bg-border/50" />
              </div>
              <div className="space-y-1">
                {tasks.map((task) => {
                  const selected = selectedIds.has(task.id);
                  const dueStatus =
                    task.status === "done" ? "none" : getDueStatus(task.dueDate);
                  const overdueDays =
                    dueStatus === "overdue" && task.dueDate
                      ? daysOverdue(task.dueDate)
                      : 0;
                  return (
                    <div
                      key={task.id}
                      id={`task-row-${task.id}`}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all hover:bg-muted/40 hover:shadow-sm",
                        selected && "bg-primary/5 ring-1 ring-primary/30",
                        task.status === "done" && !selected && "opacity-60",
                        dueStatus === "overdue" &&
                          "border border-destructive/40 bg-destructive/5",
                        dueStatus === "today" && "border border-[#A45C3D]/30 bg-[#A45C3D]/5",
                        // 从日历跳过来的高亮（最后应用，权重最高）
                        focusedTaskId === task.id &&
                          "!ring-2 !ring-primary/60 !bg-primary/15",
                      )}
                    >
                      {/* 复选框 */}
                      <button
                        onClick={() => handleToggleSelect(task.id)}
                        className="shrink-0"
                        aria-label={selected ? "取消选择" : "选择"}
                      >
                        {selected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground" />
                        )}
                      </button>
                      {/* 优先级圆点 */}
                      <span
                        className={cn(
                          "h-2.5 w-2.5 shrink-0 rounded-full",
                          priorityDot[task.priority],
                        )}
                      />
                      {/* 主体 */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            task.status === "done" && "line-through",
                          )}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/80">
                          {task.category && (
                            <span
                              className="rounded px-1.5 py-0.5 font-medium"
                              style={{
                                backgroundColor: `${categoryMap.get(task.categoryId ?? "") ?? categoryMap.get(task.category) ?? "#A8A29E"}20`,
                                color:
                                  categoryMap.get(task.categoryId ?? "") ??
                                  categoryMap.get(task.category) ??
                                  undefined,
                              }}
                            >
                              {task.category}
                            </span>
                          )}
                          {task.dueDate && (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium",
                                dueStatus !== "none" && dueStatusColor[dueStatus],
                              )}
                              title={
                                dueStatus === "overdue"
                                  ? `已逾期 ${overdueDays} 天`
                                  : dueStatus === "today"
                                    ? "今日到期"
                                    : dueStatus === "tomorrow"
                                      ? "明日到期"
                                      : dueStatus === "thisWeek"
                                        ? "本周到期"
                                        : "之后到期"
                              }
                            >
                              {dueStatus === "overdue"
                                ? `逾期 ${overdueDays} 天 · ${format(parseISO(task.dueDate), "M月d日", { locale: zhCN })}`
                                : format(parseISO(task.dueDate), "M月d日", {
                                    locale: zhCN,
                                  })}
                            </span>
                          )}
                          {task.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="text-muted-foreground/60">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {/* 状态 */}
                      <span
                        className={cn(
                          "shrink-0 text-[11px] font-medium",
                          task.status === "done"
                            ? "text-primary"
                            : task.status === "in_progress"
                              ? "text-[#A45C3D]"
                              : "text-muted-foreground/60",
                        )}
                      >
                        {task.status === "done"
                          ? "✓ 完成"
                          : task.status === "in_progress"
                            ? "进行中"
                            : "待办"}
                      </span>
                      {/* 操作 */}
                      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => handleEdit(task)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                          title="编辑"
                          aria-label="编辑任务"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="删除"
                          aria-label="删除任务"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <TaskDialog
        open={dialogOpen}
        task={editingTask}
        defaultDate={presetDate}
        onClose={() => {
          setDialogOpen(false);
          setEditingTask(null);
          // 清除 URL 参数
          if (typeof window !== "undefined" && window.location.search) {
            window.history.replaceState({}, "", "/tasks");
          }
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}
