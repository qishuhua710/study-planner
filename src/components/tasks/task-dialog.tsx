"use client";

import { useState, useEffect } from "react";
import { X, ListTodo, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addTask,
  updateTask,
  generateTaskId,
  type Task,
} from "@/lib/tasks";
import {
  getCategories,
  addCategory,
  categoryColorPresets,
  type Category,
} from "@/lib/categories";
import type { Priority, Status } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  task?: Task | null;
  defaultDate?: string; // 创建时预填日期
  onClose: () => void;
  onSaved: () => void;
}

export function TaskDialog({
  open,
  task,
  defaultDate,
  onClose,
  onSaved,
}: TaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [status, setStatus] = useState<Status>("todo");
  const [dueDate, setDueDate] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [tagsText, setTagsText] = useState("");

  // 分类管理（新建分类时临时弹出色板）
  const [categories, setCategories] = useState<Category[]>([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState(
    categoryColorPresets[0].value,
  );

  useEffect(() => {
    if (!open) return;
    setCategories(getCategories());
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setPriority(task.priority);
      setStatus(task.status);
      setDueDate(task.dueDate ?? "");
      setCategoryId(task.categoryId);
      setTagsText(task.tags.join(", "));
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("todo");
      setDueDate(defaultDate ?? "");
      setCategoryId(undefined);
      setTagsText("");
    }
    // 重置新建分类 UI
    setShowNewCategory(false);
    setNewCategoryName("");
  }, [open, task, defaultDate]);

  if (!open) return null;

  function handleSubmit() {
    if (!title.trim()) {
      toast.error("请输入任务标题");
      return;
    }
    const tags = tagsText
      .split(/[,，、\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    // 通过 categoryId 反查分类名（兼容旧任务无 categoryId 的情况）
    const selectedCat = categoryId
      ? categories.find((c) => c.id === categoryId)
      : undefined;
    const categoryName = selectedCat?.name ?? "其他";

    if (task) {
      updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        dueDate: dueDate || undefined,
        categoryId,
        category: categoryName,
        tags,
      });
      toast.success("任务已更新");
    } else {
      addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        status,
        dueDate: dueDate || undefined,
        categoryId,
        category: categoryName,
        tags,
      });
      toast.success("任务已创建");
    }
    onSaved();
    onClose();
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) {
      toast.error("请输入分类名");
      return;
    }
    const cat = addCategory(newCategoryName, newCategoryColor);
    setCategories(getCategories());
    setCategoryId(cat.id);
    setShowNewCategory(false);
    setNewCategoryName("");
    toast.success(`已创建分类：${cat.name}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">
              {task ? "编辑任务" : "新建任务"}
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
            <Label className="text-xs text-muted-foreground">标题 *</Label>
            <Input
              autoFocus
              placeholder="比如：做第三章习题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">描述</Label>
            <textarea
              placeholder="可选：补充说明"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">优先级</Label>
              <div className="flex gap-1">
                {(["high", "medium", "low"] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      priority === p
                        ? p === "high"
                          ? "bg-[#A45C3D] text-white"
                          : p === "medium"
                            ? "bg-[#8B9D6B] text-white"
                            : "bg-[#7C8471] text-white"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {p === "high" ? "高" : p === "medium" ? "中" : "低"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">状态</Label>
              <div className="flex gap-1">
                {(["todo", "in_progress", "done"] as Status[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      status === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {s === "todo"
                      ? "待办"
                      : s === "in_progress"
                        ? "进行"
                        : "完成"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">截止日</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">分类</Label>
              {!showNewCategory ? (
                <div className="flex gap-1">
                  <select
                    value={categoryId ?? ""}
                    onChange={(e) =>
                      setCategoryId(e.target.value || undefined)
                    }
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <option value="">无</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted"
                    title="新建分类"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2 rounded-md border bg-muted/30 p-2">
                  <Input
                    placeholder="分类名"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {categoryColorPresets.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setNewCategoryColor(c.value)}
                        className={cn(
                          "h-5 w-5 rounded-full border-2 transition-all",
                          newCategoryColor === c.value
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-105",
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddCategory}
                      className="h-7 flex-1 text-xs"
                    >
                      添加
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategoryName("");
                      }}
                      className="h-7 text-xs"
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              标签（用逗号分隔）
            </Label>
            <Input
              placeholder="如：重点, 习题, 第三章"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t bg-muted/20 px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onClose}>
            取消
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            {task ? "保存" : "创建"}
          </Button>
        </div>
      </div>
    </div>
  );
}
