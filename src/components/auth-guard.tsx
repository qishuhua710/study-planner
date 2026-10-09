"use client";

/**
 * 路由保护组件
 *
 * - 未登录用户访问 (main)/* 时自动跳转到 /login
 * - 已登录用户访问 /login 或 /register 时自动跳转到 /calendar
 * - 加载中显示 loading
 */

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (loading) return;

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
  }, [user, loading, pathname, router]);

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