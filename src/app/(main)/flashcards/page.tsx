"use client";

import { Layers, Shuffle, Brain } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function FlashcardsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">抽认卡</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          卡片翻转自测，巩固记忆
        </p>
      </div>

      <EmptyState
        icon={<Layers className="h-6 w-6" />}
        title="抽认卡功能即将上线"
        description="新建卡片 → 输入问题/答案 → 翻转自测。支持批量导入、按掌握程度分组。"
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <Layers className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium">卡片管理</p>
          <p className="mt-1 text-xs text-muted-foreground">
            按学科/章节分类，支持批量编辑
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <Shuffle className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium">随机练习</p>
          <p className="mt-1 text-xs text-muted-foreground">
            智能打乱顺序，模拟真实考试
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <Brain className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium">间隔复习</p>
          <p className="mt-1 text-xs text-muted-foreground">
            标记掌握程度，自动排复习队列
          </p>
        </div>
      </div>
    </div>
  );
}