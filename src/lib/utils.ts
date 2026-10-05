import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * 合并 Tailwind class，处理冲突 + 条件类
 * shadcn/ui 组件依赖此工具
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
