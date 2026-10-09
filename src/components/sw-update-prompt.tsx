"use client";

/**
 * Service Worker 更新提示
 *
 * 当 SW 检测到新版本时，弹一个 toast 让用户立即刷新
 * 避免用户卡在旧版本（看不到新功能 / bug 修复）
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

export function ServiceWorkerUpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // 检查是否已有等待中的新版本
          if (reg.waiting) {
            setWaitingWorker(reg.waiting);
            promptUpdate(reg.waiting);
          }

          // 监听新版本 install 完成
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // 新版本已安装但还在等旧的退出
                setWaitingWorker(newWorker);
                promptUpdate(newWorker);
              }
            });
          });

          // 定期检查更新（每 60 分钟）
          const checkInterval = setInterval(() => {
            reg.update().catch(() => {});
          }, 60 * 60 * 1000);

          // 保存 interval ID 以便清理
          (window as any).__swCheckInterval = checkInterval;
        })
        .catch(() => {
          // 注册失败静默
        });
    };

    // 监听 controller 变化（新 SW 接管）
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("load", onLoad);
      const interval = (window as any).__swCheckInterval;
      if (interval) clearInterval(interval);
    };
  }, []);

  function promptUpdate(worker: ServiceWorker) {
    toast.info("有新版本可用", {
      description: "点击立即刷新以加载最新内容",
      duration: Infinity,
      action: {
        label: "立即刷新",
        onClick: () => {
          worker.postMessage({ type: "SKIP_WAITING" });
        },
      },
      icon: <RefreshCw className="h-4 w-4" />,
    });
  }

  return null;
}