import { Shield, Lock, Eye, Trash2 } from "lucide-react";

export default function PrivacyPage() {
  return (
    <article className="prose-container space-y-6 text-sm leading-relaxed text-foreground/90">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">隐私政策</h1>
        <p className="text-muted-foreground">
          我们非常重视你的隐私。本站的核心承诺：
          <strong className="text-foreground">你的数据在你手里</strong>。
        </p>
      </header>

      <Section title="我们不收集什么" icon={<Shield className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5">
          <li>❌ 不收集你的姓名、邮箱、手机号等个人信息</li>
          <li>❌ 不上传你的任务、时间块、课表、笔记到任何服务器</li>
          <li>❌ 不使用任何第三方统计 / 追踪 / 广告 SDK</li>
          <li>❌ 不读取你的浏览器 Cookie（本站不写也不读）</li>
        </ul>
      </Section>

      <Section title="数据存在哪里" icon={<Lock className="h-4 w-4" />}>
        <p>
          所有用户数据（任务、时间块、课表、备注、设置、AI 配置）均
          <strong>保存在浏览器 localStorage</strong>，物理上就在你的电脑 / 手机上。
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>清除浏览器数据 = 丢失本站数据</li>
          <li>卸载浏览器扩展 / 隐私模式可能导致数据无法保存</li>
          <li>不同浏览器 / 设备之间<strong>不会自动同步</strong>（除非你手动导入导出）</li>
        </ul>
        <p className="rounded-lg bg-primary/10 px-3 py-2 text-foreground/80">
          <strong>建议</strong>：定期在「设置 → 数据管理」导出 JSON 备份，
          防止误操作或设备损坏导致数据丢失。
        </p>
      </Section>

      <Section title="AI 排程的数据流向" icon={<Eye className="h-4 w-4" />}>
        <p>
          <strong>默认情况下 AI 排程完全不启用</strong>，所有数据都留在本地。
          当你主动点击"AI 智能排程"并填写 API Key 后：
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            浏览器会向你在设置中配置的 <strong>第三方 LLM 服务</strong>（DeepSeek / OpenAI / Ollama 等）
            发送一个 HTTP 请求
          </li>
          <li>
            请求内容仅包含：
            <ul className="list-disc pl-5 mt-1">
              <li>日期（yyyy-MM-dd）</li>
              <li>当天的任务标题、优先级、状态、截止日期（<strong>不含任务描述/笔记</strong>）</li>
              <li>当天课程节次（不含教室之外的扩展信息）</li>
              <li>已有时间块的标题与起止时间（不含备注）</li>
              <li>节次时间表（与课程配置一致）</li>
            </ul>
          </li>
          <li>
            你的 <strong>API Key 仅存在你自己的 localStorage</strong>，
            不会被本站或任何中转服务器存储 / 转售
          </li>
          <li>
            第三方 LLM 服务商对请求内容的留存与使用，
            按<strong>该服务商自己的隐私政策</strong>执行（不在本站控制范围）
          </li>
        </ol>
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-foreground/80">
          <strong>敏感信息提醒</strong>：
          任务标题会被发送到第三方。请勿在任务标题中写入
          身份证号 / 银行卡 / 密码 / 真实姓名 / 联系方式等敏感信息。
        </p>
      </Section>

      <Section title="节假日 API 数据" icon={<Eye className="h-4 w-4" />}>
        <p>
          设置中切换"在线 API"数据源时，浏览器会请求 timor.tech 的公开接口获取节假日数据。
          请求中<strong>不包含任何个人信息</strong>。
          此功能为可选，默认使用本地内置数据。
        </p>
      </Section>

      <Section title="你的权利" icon={<Trash2 className="h-4 w-4" />}>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>查看</strong>：所有数据都在浏览器 DevTools → Application → Local Storage</li>
          <li><strong>导出</strong>：设置 → 数据管理 → 导出 JSON</li>
          <li><strong>清除</strong>：设置 → 数据管理 → 清空所有数据；或清除浏览器站点数据</li>
          <li><strong>撤回 AI 调用</strong>：清空设置页 API Key 即可，第三方服务商侧需自行联系</li>
        </ul>
      </Section>

      <Section title="政策更新">
        <p>
          本政策可能随项目演进而更新。重大变更会通过站内通知公示，
          继续使用即视为接受。
        </p>
        <p className="text-xs text-muted-foreground">
          最后更新：2026 年 9 月
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
