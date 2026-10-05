/**
 * 通用空状态组件
 *
 * 用于：
 * - 任务列表 0 项时
 * - 课表未导入时
 * - 时间块为空时
 * - 搜索无结果时
 *
 * 设计原则：
 * - 大图标 + 一句话主标题 + 副标题说明
 * - 可选主操作按钮（CTA）
 * - 可选次操作按钮（链接）
 */

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  primary?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondary?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  primary,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center sm:py-16",
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground/70 sm:mb-4 sm:h-14 sm:w-14">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold sm:text-lg">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {(primary || secondary) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:mt-6">
          {primary &&
            (primary.href ? (
              <a
                href={primary.href}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                {primary.label}
              </a>
            ) : (
              <button
                onClick={primary.onClick}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                {primary.label}
              </button>
            ))}
          {secondary &&
            (secondary.href ? (
              <a
                href={secondary.href}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                {secondary.label}
              </a>
            ) : (
              <button
                onClick={secondary.onClick}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                {secondary.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}