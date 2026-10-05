// 第一版 UI 预览用 mock 数据（无后端连接）
// 用户注册 Supabase 后替换为真实数据

export type Priority = "high" | "medium" | "low";
export type Status = "todo" | "in_progress" | "done";

export interface MockTask {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: Status;
  dueDate?: string; // ISO date
  category: string;
  tags: string[];
}

export interface MockEvent {
  id: string;
  title: string;
  date: string; // ISO date
  color: string;
  type: "task" | "time-block" | "exam";
}

export const mockExams = [
  {
    id: "exam-1",
    name: "数字逻辑期末",
    examDate: "2026-09-28",
    phaseRanges: {
      basic: ["2026-09-01", "2026-09-15"],
      intensive: ["2026-09-16", "2026-09-25"],
      sprint: ["2026-09-26", "2026-09-28"],
    },
  },
  {
    id: "exam-2",
    name: "人工智能基础",
    examDate: "2026-10-10",
    phaseRanges: {
      basic: ["2026-09-10", "2026-09-25"],
      intensive: ["2026-09-26", "2026-10-05"],
      sprint: ["2026-10-06", "2026-10-10"],
    },
  },
];

export const mockTasks: MockTask[] = [
  {
    id: "t1",
    title: "复习组合逻辑电路",
    description: "重点看编码器、译码器、数据选择器",
    priority: "high",
    status: "in_progress",
    dueDate: "2026-09-18",
    category: "数字逻辑",
    tags: ["组合逻辑", "重点"],
  },
  {
    id: "t2",
    title: "做人工智能第三章习题",
    description: "搜索算法部分，A* 算法练习",
    priority: "high",
    status: "todo",
    dueDate: "2026-09-19",
    category: "人工智能",
    tags: ["搜索算法"],
  },
  {
    id: "t3",
    title: "背英语单词 List 5-8",
    priority: "medium",
    status: "todo",
    dueDate: "2026-09-20",
    category: "英语",
    tags: ["词汇"],
  },
  {
    id: "t4",
    title: "时序逻辑电路复习",
    description: "触发器、计数器、寄存器",
    priority: "high",
    status: "todo",
    dueDate: "2026-09-22",
    category: "数字逻辑",
    tags: ["时序逻辑"],
  },
  {
    id: "t5",
    title: "人工智能决策树章节",
    priority: "medium",
    status: "todo",
    dueDate: "2026-09-24",
    category: "人工智能",
    tags: ["机器学习"],
  },
  {
    id: "t6",
    title: "数字逻辑模拟卷 1",
    priority: "high",
    status: "todo",
    dueDate: "2026-09-25",
    category: "数字逻辑",
    tags: ["模拟题"],
  },
  {
    id: "t7",
    title: "整理人工智能笔记",
    priority: "low",
    status: "done",
    dueDate: "2026-09-15",
    category: "人工智能",
    tags: ["笔记"],
  },
  {
    id: "t8",
    title: "英语阅读理解专项",
    priority: "medium",
    status: "todo",
    dueDate: "2026-09-26",
    category: "英语",
    tags: ["阅读"],
  },
  {
    id: "t9",
    title: "数字逻辑冲刺复习",
    description: "查漏补缺，重点回顾错题",
    priority: "high",
    status: "todo",
    dueDate: "2026-09-27",
    category: "数字逻辑",
    tags: ["冲刺"],
  },
  {
    id: "t10",
    title: "人工智能模拟卷 1",
    priority: "medium",
    status: "todo",
    dueDate: "2026-09-30",
    category: "人工智能",
    tags: ["模拟题"],
  },
];

// 日历上的事件（从任务截止日 + 时间块 + 考试日生成）
export const mockEvents: MockEvent[] = [
  // 任务截止日 — 陶土/橄榄/鼠尾草低饱和系
  ...mockTasks
    .filter((t) => t.dueDate)
    .map((t) => ({
      id: `ev-${t.id}`,
      title: t.title,
      date: t.dueDate!,
      color:
        t.priority === "high"
          ? "#A45C3D"      // 陶土棕 — 重要但不刺眼
          : t.priority === "medium"
            ? "#8B9D6B"     // 橄榄绿
            : "#7C8471",    // 鼠尾草灰绿
      type: "task" as const,
    })),
  // 考试日 — 深陶土红
  { id: "ev-exam1", title: "数字逻辑期末", date: "2026-09-28", color: "#8B5A3C", type: "exam" },
  // 时间块 — 自然系变体
  { id: "ev-tb1", title: "上午复习·数字逻辑", date: "2026-09-17", color: "#5C8A6B", type: "time-block" },
  { id: "ev-tb2", title: "下午做题·人工智能", date: "2026-09-17", color: "#8B7E6B", type: "time-block" },
  { id: "ev-tb3", title: "晚自习·英语", date: "2026-09-17", color: "#6B8E7B", type: "time-block" },
  { id: "ev-tb4", title: "上午复习·时序逻辑", date: "2026-09-18", color: "#5C8A6B", type: "time-block" },
];

export const priorityLabel: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const statusLabel: Record<Status, string> = {
  todo: "待办",
  in_progress: "进行中",
  done: "已完成",
};
