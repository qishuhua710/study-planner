"use client";

import { useState, useRef, useEffect } from "react";
import { Star, NotebookPen, Plus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isStarred,
  setStarred,
  setNote,
  getNoteText,
  type DayNote,
} from "@/lib/day-notes";

interface DayMenuProps {
  date: string;
  dateLabel: string;
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * 日期操作 Popover 菜单
 * - 切换重点标注
 * - 添加/编辑备注
 * - 添加任务 / 时间块（占位，先跳任务页）
 */
export function DayMenu({
  date,
  dateLabel,
  open,
  anchorEl,
  onClose,
  onChanged,
}: DayMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [starred, setStarredState] = useState(false);
  const [savedNote, setSavedNote] = useState<DayNote | null>(null);

  // 每次打开重读最新数据
  useEffect(() => {
    if (open) {
      setStarredState(isStarred(date));
      setText(getNoteText(date));
      setSavedNote({
        date,
        note: getNoteText(date),
        starred: isStarred(date),
        updatedAt: new Date().toISOString(),
      });
      setEditing(false);
    }
  }, [open, date]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        anchorEl &&
        !anchorEl.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, anchorEl, onClose]);

  if (!open || !anchorEl) return null;

  // 计算菜单位置（默认在 anchor 正上方，超出视口则翻到下方；左右超出则向内收敛）
  const rect = anchorEl.getBoundingClientRect();
  const menuWidth = 320;
  const menuHeight = editing ? 280 : 220;
  // 默认上方
  let top = rect.top - menuHeight - 6;
  // 顶部空间不够则翻到下方
  if (typeof window !== "undefined" && top < 8) {
    top = rect.bottom + 6;
  }
  let left = rect.left;

  if (typeof window !== "undefined") {
    // 水平居中对齐到 anchor 中线（更美观）
    const centeredLeft = rect.left + rect.width / 2 - menuWidth / 2;
    // 左右都留 8px 安全边距
    left = Math.max(8, Math.min(centeredLeft, window.innerWidth - menuWidth - 8));
    // 避免下方翻出视口底部
    if (
      top + menuHeight > window.innerHeight - 8 &&
      rect.top - menuHeight - 6 >= 8
    ) {
      top = rect.top - menuHeight - 6;
    } else if (top + menuHeight > window.innerHeight - 8) {
      // 上下都不够就贴底
      top = window.innerHeight - menuHeight - 8;
    }
  }

  function handleToggleStar() {
    const next = !starred;
    setStarredState(next);
    setStarred(date, next);
    onChanged();
  }

  function handleSaveNote() {
    setNote(date, text.trim());
    onChanged();
    setEditing(false);
  }

  return (
    <div
      ref={menuRef}
      role="dialog"
      aria-label={`${dateLabel}的操作`}
      style={{ position: "fixed", top, left, zIndex: 60 }}
      className="w-80 rounded-2xl bg-card p-3 shadow-xl ring-1 ring-black/5"
    >
      {/* 标题 */}
      <div className="mb-2 flex items-center justify-between border-b pb-2">
        <div>
          <p className="text-xs text-muted-foreground">{dateLabel}</p>
          <p className="text-sm font-semibold">{date}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="关闭菜单"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {!editing ? (
        <div className="space-y-1">
          {/* 重点标注 */}
          <button
            onClick={handleToggleStar}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60",
              starred && "bg-primary/5",
            )}
          >
            <Star
              className={cn(
                "h-4 w-4",
                starred ? "fill-primary text-primary" : "text-muted-foreground",
              )}
            />
            <span className="flex-1 font-medium">
              {starred ? "已标注为重点" : "标记为重点"}
            </span>
            {starred && <Check className="h-3.5 w-3.5 text-primary" />}
          </button>

          {/* 备注 */}
          <button
            onClick={() => setEditing(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
          >
            <NotebookPen className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">
                {savedNote?.note ? "编辑备注" : "添加备注"}
              </p>
              {savedNote?.note && (
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {savedNote.note}
                </p>
              )}
            </div>
          </button>

          {/* 添加任务 */}
          <a
            href={`/tasks?date=${date}`}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 font-medium">添加任务</span>
          </a>

          {/* 添加时间块 */}
          <a
            href={`/calendar?add-block=${date}`}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 font-medium">添加时间块</span>
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            备注内容
          </label>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="比如：复习重点、看望父母、调休……"
            rows={4}
            className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setText(savedNote?.note ?? "");
                setEditing(false);
              }}
              className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              取消
            </button>
            <button
              onClick={handleSaveNote}
              disabled={text.trim() === (savedNote?.note ?? "")}
              className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
