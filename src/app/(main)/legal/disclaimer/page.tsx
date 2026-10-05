import { AlertTriangle, ShieldOff, Clock } from "lucide-react";

export default function DisclaimerPage() {
  return (
    <article className="prose-container space-y-6 text-sm leading-relaxed text-foreground/90">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">免责声明</h1>
        <p className="text-muted-foreground">
          请在使用本站前仔细阅读。本站为非商业个人项目，按"现状"提供。
        </p>
      </header>

      <Section title="1. 数据准确性" icon={<AlertTriangle className="h-4 w-4" />}>
        <p>本站不做任何明示或暗示的准确性承诺，包括但不限于：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>课程数据</strong>：你通过 Excel / CSV 导入的课表内容由你自行维护，
            本站不对课表与学校实际课程的一致性负责
          </li>
          <li>
            <strong>节假日数据</strong>：
            <ul className="list-disc pl-5 mt-1">
              <li>本地内置数据基于国务院办公厅当年发布的放假通知手动整理</li>
              <li>在线 API 数据来源于第三方（timor.tech），本站不对其准确性负责</li>
              <li>调休安排可能因临时通知而变化，请以官方公告为准</li>
            </ul>
          </li>
          <li>
            <strong>AI 排程建议</strong>：AI 输出仅供参考，不构成专业建议；
            实际学习计划请结合自身情况调整
          </li>
        </ul>
      </Section>

      <Section title="2. 服务可用性" icon={<ShieldOff className="h-4 w-4" />}>
        <p>本站不承诺：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>服务 100% 可用（可能出现 bug、维护、第三方 API 不可用等情况）</li>
          <li>数据 100% 不丢失（浏览器数据可能被用户误清除或设备故障）</li>
          <li>特定功能在所有浏览器 / 设备上完美运行（PWA、桌面通知等依赖浏览器能力）</li>
        </ul>
      </Section>

      <Section title="3. 责任限制" icon={<ShieldOff className="h-4 w-4" />}>
        <p>
          在法律允许的最大范围内，因使用或无法使用本站而引致的任何直接、间接、
          偶然、特殊或后果性损害（包括但不限于：错过考试、漏做作业、
          数据丢失、学习效率下降等），本站及其作者均不承担责任。
        </p>
        <p className="rounded-lg bg-muted/50 p-3 text-foreground/80">
          本站为<strong>非商业</strong>个人项目，
          请勿将其用于<strong>生产关键场景</strong>（如重要考试提醒的唯一来源）。
        </p>
      </Section>

      <Section title="4. 第三方内容" icon={<AlertTriangle className="h-4 w-4" />}>
        <p>本站可能包含第三方资源：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>LLM 服务</strong>：当你使用 AI 排程时，
            由 DeepSeek / OpenAI / Ollama 等第三方提供算力，
            输出内容的合规性、准确性由服务商负责
          </li>
          <li>
            <strong>节假日 API</strong>：timor.tech 提供数据，
            本站不对其数据准确性背书
          </li>
          <li>
            <strong>字体 / 图标库</strong>：Inter 字体来自 Google Fonts，
            图标来自 Lucide，均按各自许可使用
          </li>
        </ul>
      </Section>

      <Section title="5. 用户行为责任" icon={<AlertTriangle className="h-4 w-4" />}>
        <p>
          你对自己的行为及产生的后果负责，包括但不限于：
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>在 AI 排程中输入的内容及其后果</li>
          <li>API Key 的保管与使用</li>
          <li>课表 / 任务数据的真实性</li>
        </ul>
      </Section>

      <Section title="6. 知识产权声明" icon={<AlertTriangle className="h-4 w-4" />}>
        <p>
          本站尊重他人知识产权。如你认为本站内容侵犯了你的版权，
          请通过 GitHub Issue 联系作者，我们会在 7 个工作日内处理。
        </p>
      </Section>

      <Section title="7. 免责声明的变更" icon={<Clock className="h-4 w-4" />}>
        <p>
          本声明可能随项目演进而更新。重大变更会通过站内通知公示。
          最后更新：2026 年 9 月。
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
      <h2 className="flex items-center gap-2 text-base font-semibold">{icon}{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
