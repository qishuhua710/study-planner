import { BookOpen, Heart, Github, Sparkles } from "lucide-react";

export default function AboutPage() {
  return (
    <article className="prose-container space-y-6 text-sm leading-relaxed text-foreground/90">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">关于本站</h1>
        <p className="text-muted-foreground">
          一个为学生设计的轻量学习日程管理工具。
        </p>
      </header>

      <Section title="项目初衷" icon={<Heart className="h-4 w-4" />}>
        <p>
          本站（学习日程管理 / Study Planner）致力于解决学生群体在学习过程中遇到的
          <strong>课程多、任务杂、时间碎</strong>等痛点。
          通过日历、任务、番茄钟、智能排程四大模块的协同，
          帮助用户把"应该学什么"和"什么时候学"打通。
        </p>
        <p>
          我们坚持"轻量、本地优先、可选 AI"的理念：核心功能完全离线可用，
          AI 仅作为增强选项，且 API Key 只存在你的浏览器里。
        </p>
      </Section>

      <Section title="核心功能" icon={<Sparkles className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>日历视图</strong>：月 / 周 / 日三种模式，支持拖拽时间块到任意日期或具体节次
          </li>
          <li>
            <strong>任务管理</strong>：支持优先级、状态、分类、截止日期；逾期 / 今日 / 明日智能分组
          </li>
          <li>
            <strong>番茄钟</strong>：专注 / 倒计时 / 正计时三模式；休息日自动提示
          </li>
          <li>
            <strong>课表导入</strong>：支持 Excel（.xlsx）和 CSV，一键解析周次 / 节次 / 教室
          </li>
          <li>
            <strong>智能排程</strong>：本地规则 + 可选 AI 增强（DeepSeek / OpenAI / Ollama 等）
          </li>
          <li>
            <strong>PWA</strong>：可安装到桌面 / 主屏，离线可用
          </li>
        </ul>
      </Section>

      <Section title="技术栈" icon={<BookOpen className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5">
          <li>Next.js 14 + TypeScript + Tailwind CSS</li>
          <li>dnd-kit（拖拽）</li>
          <li>localStorage（数据持久化，Phase 1）</li>
          <li>Supabase（数据同步，Phase 3 计划）</li>
          <li>Tauri（桌面端封装）</li>
        </ul>
      </Section>

      <Section title="开源与反馈">
        <p>
          本站为个人学习项目，代码开源（具体协议见 GitHub 仓库）。
          欢迎提 Issue、PR 或建议。
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Github className="h-4 w-4" />
          <span>仓库地址：见项目根目录 README</span>
        </p>
      </Section>

      <Section title="作者寄语">
        <p className="rounded-lg bg-muted/40 p-4 text-foreground/80">
          休息也是学习的一部分。<br />
          愿你劳逸结合，按自己的节奏前进。
        </p>
      </Section>
    </article>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        {icon}
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
