import { Bot, AlertTriangle, BookCheck, ShieldCheck } from "lucide-react";

export default function AiDisclosurePage() {
  return (
    <article className="prose-container space-y-6 text-sm leading-relaxed text-foreground/90">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Bot className="h-6 w-6" />
          AI 使用声明
        </h1>
        <p className="text-muted-foreground">
          本声明按《生成式人工智能服务管理暂行办法》及国际通用 AI 透明性原则起草。
        </p>
      </header>

      <section className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-foreground/90">
        <p className="font-medium">
          ⚠️ 本站可选接入第三方大语言模型（LLM）实现"AI 智能排程"功能。
          在你<strong>主动配置 API Key 并点击 AI 排程按钮</strong>之前，
          本站不调用任何 AI 服务。
        </p>
      </section>

      <Section title="1. AI 在本站的角色" icon={<BookCheck className="h-4 w-4" />}>
        <p>AI 仅用于以下<strong>单一场景</strong>：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            输入：当天任务 + 课程 + 时间块 + 偏好（最长专注时长 / 偏好时段）
          </li>
          <li>
            输出：候选时间块列表（标题 / 起止时间 / 简短理由）
          </li>
        </ul>
        <p>
          AI <strong>不参与</strong>：数据存储、用户身份识别、内容审核、
          自动决策（用户必须人工确认后才写入时间块）。
        </p>
      </Section>

      <Section title="2. 使用的模型与服务" icon={<Bot className="h-4 w-4" />}>
        <p>
          本站默认提供以下 OpenAI 兼容服务（你在设置页可任意切换）：
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>DeepSeek</strong>（推荐，便宜 + 中文好）：deepseek.com</li>
          <li><strong>月之暗面 Moonshot</strong>：moonshot.cn</li>
          <li><strong>Ollama</strong>（本地免费）：ollama.com</li>
          <li><strong>OpenAI</strong>：openai.com（需海外网络 + 浏览器直连受限）</li>
          <li><strong>自定义</strong>：任何 OpenAI 协议兼容服务（vLLM、OpenRouter 等）</li>
        </ul>
        <p className="text-muted-foreground">
          本站本身<strong>不提供</strong>、<strong>不托管</strong>、<strong>不代理</strong>任何 AI 模型。
          所有调用都从<strong>你的浏览器直接发送到你配置的第三方服务</strong>。
        </p>
      </Section>

      <Section title="3. 数据流向（重要）" icon={<ShieldCheck className="h-4 w-4" />}>
        <p>当你点击"AI 智能排程"时，浏览器发出的请求包含：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>会发送</strong>：任务标题、优先级、状态、截止日期（不含描述/笔记）</li>
          <li><strong>会发送</strong>：课程节次时间表（与你配置的课程一致）</li>
          <li><strong>会发送</strong>：当天已有时间块的标题与起止时间</li>
          <li><strong>会发送</strong>：你的偏好（最长专注时长等）</li>
          <li><strong>会发送</strong>：系统提示词（内置）+ 用户提示词（自动拼装）</li>
          <li><strong>不会发送</strong>：任务描述、任务备注、你的个人信息、你的 API Key 本身（用于鉴权，不作为内容）</li>
        </ul>
        <p className="rounded-lg bg-muted/50 p-3 text-foreground/80">
          <strong>⚠️ 提示</strong>：第三方服务商对请求内容的留存与使用，
          按<strong>该服务商自己的隐私政策</strong>执行。
          请在使用前阅读 DeepSeek / OpenAI 等的服务条款。
        </p>
      </Section>

      <Section title="4. AI 输出的局限性" icon={<AlertTriangle className="h-4 w-4" />}>
        <p>AI 输出可能存在以下问题，使用前请知晓：</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>幻觉</strong>：AI 可能编造不存在的时间、节次或任务名
          </li>
          <li>
            <strong>越界</strong>：AI 可能把任务排进课程时段、或生成超出 24:00 的时间
          </li>
          <li>
            <strong>不一致</strong>：同样的输入多次调用可能得到不同结果
          </li>
          <li>
            <strong>不理解本地上下文</strong>：AI 不直接访问你的浏览器数据，
            所有上下文靠你在本站生成的提示词传递
          </li>
        </ul>
        <p className="rounded-lg bg-primary/10 p-3 text-foreground/80">
          <strong>本站如何缓解</strong>：
          <ul className="list-disc pl-5 mt-1">
            <li>输出"一键写入"前会做冲突检测</li>
            <li>超界（跨午夜）会自动拒绝</li>
            <li>解析失败时降级到本地规则排程</li>
          </ul>
        </p>
      </Section>

      <Section title="5. 你应当知道的事">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>不要输入敏感信息</strong>：任务标题会被发给第三方，
            请勿包含身份证号、银行卡、密码、真实姓名、联系方式等
          </li>
          <li>
            <strong>API Key 自管</strong>：本站只把它存在你浏览器 localStorage，
            不会上传任何服务器；丢失或泄露请到对应服务商后台重置
          </li>
          <li>
            <strong>花费自负</strong>：第三方 LLM 服务通常按 token 计费，
            本站不收取任何费用，但你需要自行承担调用费用
          </li>
          <li>
            <strong>可随时关闭</strong>：清空设置页的 API Key 即可完全停用 AI 功能，
            本站将自动回退到本地规则排程
          </li>
        </ul>
      </Section>

      <Section title="6. 反馈与争议">
        <p>
          如果你认为本站对 AI 的使用方式有不当之处，欢迎在 GitHub 仓库提 Issue。
          本站保留根据法规变化调整 AI 功能实现方式的权利。
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
