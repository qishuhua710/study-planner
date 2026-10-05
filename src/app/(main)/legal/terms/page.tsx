import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <article className="prose-container space-y-6 text-sm leading-relaxed text-foreground/90">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">服务条款</h1>
        <p className="text-muted-foreground">
          使用本站即视为你已阅读并同意以下条款。
        </p>
      </header>

      <Section title="1. 服务说明" icon={<FileText className="h-4 w-4" />}>
        <p>
          学习日程管理（以下简称"本站"）是一个面向学生群体的个人学习日程管理工具，
          包含日历、任务、番茄钟、课表导入、智能排程等模块。
        </p>
        <p>
          本站为非商业个人项目，按"现状"提供，不承诺特定的功能完整性、
          稳定性或适用性。
        </p>
      </Section>

      <Section title="2. 账号与数据">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            当前阶段（Phase 1）所有数据均保存在你<strong>浏览器本地</strong>（localStorage），
            不上传任何服务器。清除浏览器数据 = 丢失数据。
          </li>
          <li>
            未来接入云同步后，账号与数据存储将按届时公布的隐私政策处理。
          </li>
          <li>
            请自行做好数据备份（设置页支持 JSON 导出 / 导入）。
          </li>
        </ul>
      </Section>

      <Section title="3. 行为准则">
        <p>使用本站时，你同意：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>不利用本站从事违法或违反公序良俗的活动</li>
          <li>不尝试攻击、破解或干扰本站正常运行</li>
          <li>不在 AI 排程等接口中输入敏感个人信息（身份证号、银行卡等）</li>
        </ul>
      </Section>

      <Section title="4. 知识产权">
        <p>
          本站代码默认以开源协议发布（具体协议见 GitHub 仓库）。
          第三方资源（字体、图标库等）的版权归各自作者所有。
        </p>
      </Section>

      <Section title="5. 终止">
        <p>
          由于本站为前端单页应用，你可以随时停止使用并清除浏览器数据。
          服务端功能（如未来上线）如需终止，会提前在站内公告。
        </p>
      </Section>

      <Section title="6. 条款变更">
        <p>
          本条款可能随项目演进而更新，重大变更会通过站内通知或文档版本号公示。
          继续使用即视为接受变更。
        </p>
      </Section>

      <Section title="7. 联系方式">
        <p>
          如对本条款有疑问，请在 GitHub 仓库提 Issue，或通过站内"关于"页面的方式联系作者。
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
