"use client";

import { Volume2, Sparkles, Languages } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function ReaderPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">朗读</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          把要学的文本粘贴进来，浏览器用系统语音朗读
        </p>
      </div>

      <EmptyState
        icon={<Volume2 className="h-6 w-6" />}
        title="朗读功能即将上线"
        description="用浏览器内置 TTS，支持语速/音色调节、逐句高亮、键盘控制。无需安装任何额外软件。"
        primary={{ label: "了解开发计划", href: "/settings" }}
      />

      {/* 功能预告 */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <Languages className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium">多语言</p>
          <p className="mt-1 text-xs text-muted-foreground">
            自动选择系统已安装的中/英/日/韩语音
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <Volume2 className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium">语速控制</p>
          <p className="mt-1 text-xs text-muted-foreground">
            0.5x ~ 2x 实时调节，支持慢速跟读
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <Sparkles className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium">键盘快捷键</p>
          <p className="mt-1 text-xs text-muted-foreground">
            空格暂停/继续，方向键跳句
          </p>
        </div>
      </div>
    </div>
  );
}