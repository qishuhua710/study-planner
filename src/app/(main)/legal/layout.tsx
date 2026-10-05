"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";

const sections = [
  { href: "/legal/about", label: "关于本站" },
  { href: "/legal/terms", label: "服务条款" },
  { href: "/legal/privacy", label: "隐私政策" },
  { href: "/legal/ai-disclosure", label: "AI 使用声明" },
  { href: "/legal/disclaimer", label: "免责声明" },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-2">
      {/* 顶部返回 + 路径 */}
      <div className="flex items-center justify-between">
        <Link
          href="/calendar"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          返回日历
        </Link>
        <span className="text-xs text-muted-foreground">
          最后更新：2026 年 9 月
        </span>
      </div>

      {/* 顶部标签导航 */}
      <nav className="flex flex-wrap gap-1 rounded-xl bg-muted/40 p-1 text-xs">
        {sections.map((s) => {
          const active = pathname === s.href;
          return (
            <Link
              key={s.href}
              href={s.href}
              className={cn(
                "rounded-lg px-3 py-1.5 transition-colors",
                active
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
