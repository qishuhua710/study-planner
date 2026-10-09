"use client";

/**
 * 路由保护组件
 *
 * - 未登录用户访问 (main)/* 时自动跳转到 /login
 * - 已登录用户访问 /login 或 /register 时自动跳转到 /calendar
 * - 加载中显示 loading
 * - 环境变量未配置时显示友好提示
 */

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, configMissing } = useCurrentUser();

  useEffect(() => {
    if (loading || configMissing) return;

    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname === `${p}/`,
    );

    if (!user && !isPublic) {
      // 未登录访问受保护页面 → 跳登录
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (user && isPublic) {
      // 已登录访问登录/注册页 → 跳主页
      router.replace("/calendar");
    }
  }, [user, loading, configMissing, pathname, router]);

  // 环境变量未配置：显示友好提示
  if (!loading && configMissing) {
    const isPublic = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname === `${p}/`,
    );
    if (!isPublic) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="max-w-md space-y-4 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
            <h1 className="text-xl font-semibold">账号系统未配置</h1>
            <p className="text-sm text-muted-foreground">
              部署时缺少 NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量。
              <br />
              站点会继续展示，但无法登录或同步数据。
            </p>
            <div className="rounded-md bg-muted/50 p-3 text-left text-xs">
              <p className="mb-1 font-medium">修复方法：</p>
              <ol className="ml-4 list-decimal space-y-0.5">
                <li>登录 Vercel Dashboard</li>
                <li>进入 study-planner 项目 → Settings → Environment Variables</li>
                <li>添加 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                <li>重新部署</li>
              </ol>
            </div>
          </div>
        </div>
      );
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  // 防止 SSR/CSR 闪烁：未登录但还在判断时显示 loading 而不是内容
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname === `${p}/`,
  );
  if (!user && !isPublic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">跳转登录...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}