"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Clock, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTasks } from "@/lib/tasks";
import {
  addTimeBlock,
  updateTimeBlock,
  removeTimeBlock,
  detectConflicts,
  getTimeBlocks,
  type TimeBlock,
} from "@/lib/time-blocks";

interface TimeBlockDialogProps {
  open: boolean;
  block?: TimeBlock | null; // 传入则为编辑模式
  date?: string; // 创建模式预填日期
  startTime?: string;
  endTime?: string;
  taskId?: string;
  onClose: () => void;
  onSaved: () => void;
}

function splitDateTime(dt: string): { date: string; time: string } {
  const [date = "", time = ""] = dt.split(" ");
  return { date, time };
}

export function TimeBlockDialog({
  open,
  block,
  date: initDate,
  startTime: initStart = "19:00",
  endTime: initEnd = "20:00",
  taskId: initTaskId,
  onClose,
  onSaved,
}: TimeBlockDialogProps) {
  const [title, setTitle] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [start, setStart] = useState(initStart);
  const [end, setEnd] = useState(initEnd);
  const [taskId, setTaskId] = useState<string | undefined>(initTaskId);

  // 实时冲突检测（编辑模式排除自己）
  const conflicts = (() => {
    if (!dateVal || !start || !end) return [];
    return detectConflicts(
      `${dateVal} ${start}`,
      `${dateVal} ${end}`,
      block?.id,
    );
  })();

  const isEditing = !!block;

  useEffect(() => {
    if (!open) return;
    if (block) {
      // 编辑模式：从 block 拆出 date/time
      const startParts = splitDateTime(block.startTime);
      const endParts = splitDateTime(block.endTime);
      setTitle(block.title);
      setDateVal(startParts.date);
      setStart(startParts.time);
      setEnd(endParts.time);
      setTaskId(block.taskId);
    } else {
      // 创建模式：用 props 预填
      setDateVal(initDate ?? "");
      setStart(initStart);
      setEnd(initEnd);
      setTaskId(initTaskId);
      setTitle(
        initTaskId
          ? getTasks().find((t) => t.id === initTaskId)?.title ?? ""
          : "",
      );
    }
  }, [open, block, initDate, initStart, initEnd, initTaskId]);

  if (!open) return null;

  function handleSubmit() {
    if (!title.trim()) {
      toast.error("请输入时间块标题");
      return;
    }
    if (start >= end) {
      toast.error("开始时间必须早于结束时间");
      return;
    }
    // 冲突检测：有冲突时弹窗确认
    if (conflicts.length > 0) {
      const list = conflicts
        .map((c) => `  · ${c.title} (${c.startTime.slice(11)}-${c.endTime.slice(11)})`)
        .join("\n");
      const ok = window.confirm(
        `此时间与现有 ${conflicts.length} 个时间块重叠：\n${list}\n\n仍要创建吗？`,
      );
      if (!ok) return;
    }
    if (block) {
      updateTimeBlock(block.id, {
        title: title.trim(),
        startTime: `${dateVal} ${start}`,
        endTime: `${dateVal} ${end}`,
        taskId,
      });
      toast.success("时间块已更新");
    } else {
      addTimeBlock({
        title: title.trim(),
        startTime: `${dateVal} ${start}`,
        endTime: `${dateVal} ${end}`,
        taskId,
      });
      toast.success("时间块已添加");
    }
    onSaved();
    onClose();
  }

  function handleDelete() {
    if (!block) return;
    if (!confirm("确认删除此时间块？")) return;
    removeTimeBlock(block.id);
    toast.success("时间块已删除");
    onSaved();
    onClose();
  }

  // 时长提示
  const durationMin = (() => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if (isNaN(sh) || isNaN(eh)) return 0;
    return eh * 60 + em - (sh * 60 + sm);
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">
              {isEditing ? "编辑时间块" : "添加时间块"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">标题</Label>
            <Input
              autoFocus
              placeholder="如：复习数字逻辑、做英语阅读……"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">关联任务（可选）</Label>
            <select
              value={taskId ?? ""}
              onChange={(e) => {
                const id = e.target.value || undefined;
                setTaskId(id);
                if (id && !title) {
                  const t = getTasks().find((x) => x.id === id);
                  if (t) setTitle(t.title);
                }
              }}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">不关联</option>
              {getTasks()
                .filter((t) => t.status !== "done")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
            {/* 选中任务后显示该任务的已规划时间块 */}
            {taskId && (
              <LinkedTaskSummary taskId={taskId} />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">日期</Label>
            <Input
              type="date"
              value={dateVal}
              onChange={(e) => setDateVal(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">开始</Label>
              <Input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">结束</Label>
              <Input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          {durationMin > 0 && (
            <p className="text-xs text-muted-foreground">
              时长：{durationMin} 分钟
              {durationMin > 180 && " · 较长，建议拆分"}
            </p>
          )}

          {/* 冲突提示 */}
          {conflicts.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-50 px-3 py-2 text-xs dark:bg-amber-950/20">
              <div className="mb-1 flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                与 {conflicts.length} 个时间块重叠
              </div>
              <ul className="space-y-0.5 text-amber-700/90 dark:text-amber-300/90">
                {conflicts.map((c) => (
                  <li key={c.id} className="truncate">
                    · {c.title}（{c.startTime.slice(11)}-{c.endTime.slice(11)}）
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-amber-600/80 dark:text-amber-400/80">
                仍可保存，系统不会阻止你创建
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-muted/20 px-5 py-3">
          {isEditing ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> 删除
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              取消
            </Button>
            <Button size="sm" onClick={handleSubmit} className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {isEditing ? "保存" : "添加"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 显示某个任务已规划的所有时间块（在创建/编辑时间块对话框中作为关联任务预览）
 */
function LinkedTaskSummary({ taskId }: { taskId: string }) {
  const blocks = getTimeBlocks().filter((b) => b.taskId === taskId);
  if (blocks.length === 0) {
    return (
      <p className="rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground">
        该任务还没有规划时间块
      </p>
    );
  }
  // 按日期排序
  const sorted = [...blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  return (
    <div className="rounded-md border bg-muted/30 px-2.5 py-1.5 text-[11px]">
      <div className="mb-1 font-medium text-muted-foreground">
        该任务已规划 {blocks.length} 个时间块：
      </div>
      <div className="space-y-0.5">
        {sorted.slice(0, 5).map((b) => {
          const date = b.startTime.split(" ")[0]?.slice(5) ?? ""; // MM-DD
          const time = b.startTime.split(" ")[1] ?? "";
          return (
            <div key={b.id} className="flex items-center gap-1.5 text-foreground/80">
              <Clock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
              <span className="font-mono text-[11px]">{date} {time.slice(0, 5)}</span>
              <span className="truncate">{b.title}</span>
            </div>
          );
        })}
        {sorted.length > 5 && (
          <div className="text-muted-foreground/60">
            还有 {sorted.length - 5} 个…
          </div>
        )}
      </div>
    </div>
  );
}
