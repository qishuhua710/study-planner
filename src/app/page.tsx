"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 首页重定向到日历视图（spec 7.1：登录后默认进入日历）
// 用客户端重定向，兼容静态导出（output: 'export'）与 Tauri webview
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/calendar");
  }, [router]);
  return null;
}
