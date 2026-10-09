"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Timer,
  BookOpen,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTasks } from "@/lib/tasks";
import { getTimeBlocksForDate } from "@/lib/time-blocks";
import { runDueNotifier } from "@/lib/due-notifier";
import { initUserStorage } from "@/lib/user-storage";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { signOut } from "@/lib/auth";
import { AuthGuard } from "@/components/auth-guard";
import { ServiceWorkerUpdatePrompt } from "@/components/sw-update-prompt";
import { toast } from "sonner";
import { format } from "date-fns";

const navItems = [
  { href: "/calendar", label: "日历", icon: Calendar },
  { href: "/schedule", label: "课表", icon: BookOpen },
  { href: "/tasks", label: "任务", icon: CheckSquare },
  { href: "/timer", label: "计时器", icon: Timer },
  { href: "/settings", label: "设置", icon: Settings },
];

function todayKey() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useCurrentUser();

  // 初始化用户隔离存储（监听 Supabase auth state）
  useEffect(() => {
    initUserStorage();
  }, []);

  async function handleSignOut() {
    const result = await signOut();
    if (result.ok) {
      toast.success("已退出登录");
      router.push("/login");
    } else {
      toast.error("退出失败", { description: result.error });
    }
  }

  // 避免 SSR/CSR 不一致：服务端 pathname 可能为 null/不同，挂载后再判定
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isLegalPage = mounted ? pathname?.startsWith("/legal") ?? false : false;
  const [todayTaskCount, setTodayTaskCount] = useState(0);
  const [todayTimeBlockCount, setTodayTimeBlockCount] = useState(0);

  // 计算今日任务数 + 时间块数（用于导航小红点 + 标题展示）
  useEffect(() => {
    function refresh() {
      const key = todayKey();
      const tasks = getTasks().filter(
        (t) => t.dueDate === key && t.status !== "done",
      ).length;
      const blocks = getTimeBlocksForDate(key).length;
      setTodayTaskCount(tasks);
      setTodayTimeBlockCount(blocks);
    }
    refresh();
    // 监听跨标签页 / 同页 storage 变化
    window.addEventListener("storage", refresh);
    const id = setInterval(refresh, 60000); // 每分钟重算（跨日期）
    return () => {
      window.removeEventListener("storage", refresh);
      clearInterval(id);
    };
  }, []);

  // 监听 storage 跨标签同步事件（同页 setTasks 不会触发 storage，但为了捕获同页手动刷新）
  useEffect(() => {
    const handler = () => {
      const key = todayKey();
      const tasks = getTasks().filter(
        (t) => t.dueDate === key && t.status !== "done",
      ).length;
      const blocks = getTimeBlocksForDate(key).length;
      setTodayTaskCount(tasks);
      setTodayTimeBlockCount(blocks);
    };
    window.addEventListener("study-planner:data-changed", handler);
    return () => window.removeEventListener("study-planner:data-changed", handler);
  }, []);

  // 每天首次打开：桌面原生通知提醒逾期/今日任务
  useEffect(() => {
    // 延迟到第一次 paint 之后，浏览器更友好
    const id = setTimeout(() => {
      runDueNotifier();
    }, 1500);
    return () => clearTimeout(id);
  }, []);

  // 注册 PWA Service Worker（仅生产 + 支持的浏览器）
  // 实际逻辑已移至 ServiceWorkerUpdatePrompt 组件（支持更新提示）
  // 这里只保留 cleanup

  return (
    <AuthGuard>
      <ServiceWorkerUpdatePrompt />
      <div className="min-h-screen bg-background">
        {/* 顶栏：无边框，仅 backdrop-blur + 极浅阴影 */}
        <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-lg">
          <nav className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          {/* 品牌：绿点 + 字标 */}
          <Link
            href="/calendar"
            className="mr-auto flex items-center gap-2 text-base font-semibold tracking-tight"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="hidden xs:inline sm:inline">学习日程</span>
            {(todayTaskCount > 0 || todayTimeBlockCount > 0) && (
              <span className="ml-1 hidden items-center gap-1.5 text-[11px] font-normal text-muted-foreground sm:inline-flex">
                {todayTaskCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    <CheckSquare className="h-3 w-3" />
                    {todayTaskCount} 待办
                  </span>
                )}
                {todayTimeBlockCount > 0 && (
                  <span className="hidden rounded-full bg-muted px-2 py-0.5 text-foreground/70 md:inline">
                    {todayTimeBlockCount} 时间块
                  </span>
                )}
              </span>
            )}
          </Link>
          {/* 导航项：活跃态高亮 */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              // 任务图标加小红点
              const showBadge = href === "/tasks" && todayTaskCount > 0;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-label={label}
                  className={cn(
                    "relative inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-all sm:px-3.5",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                  {showBadge && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                      {todayTaskCount > 9 ? "9+" : todayTaskCount}
                    </span>
                  )}
                </Link>
              );
            })}
            {/* 退出登录按钮 */}
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="退出登录"
                title={`退出登录 (${user.email})`}
                className="ml-1 inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent/50 hover:text-foreground sm:px-3.5"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">退出</span>
              </button>
            )}
          </div>
        </nav>
      </header>
      {/* 内容区：更宽松的留白 */}
      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-8">{children}</main>

      {/* 页脚：声明链接 + 版权（法律文档页不显示） */}
      {!isLegalPage && (
        <footer className="border-t bg-background/40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-muted-foreground sm:px-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>© 2026 学习日程管理</span>
              <span aria-hidden="true">·</span>
              <span>非商业个人项目</span>
            </div>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link
                href="/legal/about"
                className="transition-colors hover:text-foreground"
              >
                关于
              </Link>
              <Link
                href="/legal/terms"
                className="transition-colors hover:text-foreground"
              >
                服务条款
              </Link>
              <Link
                href="/legal/privacy"
                className="transition-colors hover:text-foreground"
              >
                隐私政策
              </Link>
              <Link
                href="/legal/ai-disclosure"
                className="transition-colors hover:text-foreground"
              >
                AI 声明
              </Link>
              <Link
                href="/legal/disclaimer"
                className="transition-colors hover:text-foreground"
              >
                免责声明
              </Link>
            </nav>
          </div>
        </footer>
      )}
      </div>
    </AuthGuard>
  );
}