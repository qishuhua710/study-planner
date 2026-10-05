# 个性化学习日程管理网页 — 设计规格 (Spec)

- **版本**: 1.0
- **日期**: 2026-09-16
- **作者**: TRAE 协作生成
- **状态**: 待用户审阅

---

## 1. 概述

### 1.1 产品定位
面向需要多考试准备的学生 / 个人学习者，提供一个**云端优先、本地可装 (PWA)** 的网页应用，集成：

- 日程规划（日历 + 任务清单 + 时间块）
- 学习辅助（TTS 朗读 + 抽认卡自测）
- 学习阶段管理（基础 / 强化 / 冲刺三阶段按日期自动切换）

### 1.2 目标用户

- **起步阶段**：开发者本人（单用户试用）
- **成长阶段**：扩展至小圈子（班级 / 朋友，几十人量级）

### 1.3 成功标准

- Phase 1 (MVP) 完成后：能注册账号、创建/编辑任务、看月视图日历、用计时器，可作为日常工具使用
- Phase 2 完成后：能朗读学习材料、做抽认卡自测
- Phase 3 完成后：能按日期自动切换学习阶段，可选接入 AI 智能排程

---

## 2. 功能性需求

### 2.1 Phase 1 — MVP（核心日程）

#### 2.1.1 用户认证

- 邮箱 + 密码注册 / 登录（Supabase Auth）
- 邮件验证
- 找回密码

#### 2.1.2 任务管理

- CRUD：创建、查看、编辑、删除任务
- 任务字段：标题、描述、优先级（高 / 中 / 低）、状态（待办 / 进行中 / 完成）、截止日期、所属分类、所属考试
- 完全自定义输入：分类、标签由用户自建
- 多考试支持：每个任务可关联到一个考试项目

#### 2.1.3 日历视图

- 月视图（默认）、周视图、日视图切换
- 任务按截止日期显示
- 时间块按时间段显示
- 当天高亮
- Phase 3 后按学习阶段着色

#### 2.1.4 时间块规划

- 手动添加时间块（标题 + 起止时间 + 关联任务 + 颜色）
- 月 / 周 / 日视图同步显示
- Phase 2 起支持拖拽调整

#### 2.1.5 计时器

- 番茄钟模式（默认 25 分钟，**可手动输入任意分钟数**）
- 正计时模式
- 倒计时模式
- 完成提示音
- 完成后可选记录为时间块

#### 2.1.6 数据导出备份

- 一键导出全量数据为 JSON
- 支持从 JSON 导入恢复
- 入口在设置页

### 2.2 Phase 2 — 学习辅助

#### 2.2.1 TTS 朗读

- 使用浏览器原生 Web Speech API（不依赖第三方 TTS 服务）
- 输入任意学习材料文本
- 解析为段落 + 自动标签（如题型、章节）
- **不记录来源、不保存朗读历史**
- 循环播放按键：单段循环 / 全文循环 / 不循环
- 可最小化为背景朗读（不阻塞主界面操作）

#### 2.2.2 抽认卡自测

- 用户自定义输入卡正面 / 背面
- 隐藏答案模式：先看正面，做完后点 "显示答案" 对照
- 重做后可切换状态（new ↔ reviewed）
- **不做 "记住了 / 没记住" 评分按钮**（不做 Anki 间隔重复算法）

### 2.3 Phase 3 — 学习阶段 & AI

#### 2.3.1 三阶段日期区间

- 用户在设置里配置三阶段日期区间（如 9 月基础、10 月强化、11 月冲刺）
- 系统按今天日期自动判断当前阶段
- 日历视图按阶段着色（基础 = 蓝、强化 = 橙、冲刺 = 红）
- 任务列表可按阶段筛选

#### 2.3.2 AI 智能排程（可选）

- **由用户自行接入自己的 API**：用户在设置页填入自己的 LLM API 配置（提供商 + Base URL + API Key + 模型名），保存在自己的 `profiles.preferences.aiConfig`（前端可加密存储）
- 默认兼容 OpenAI 兼容协议（覆盖 OpenAI / 智谱 GLM / MiniMax / DeepSeek 等大多数国内厂商）
- 输入：当前任务列表 + 时间偏好 + 当前阶段
- 输出：建议的时间块安排，用户确认后可一键写入日历
- 调用走 Next.js API Route：用户 API Key 通过服务端转发到对应 LLM，避免暴露到前端运行时和跨域问题
- **用户负责自行测试 API 可用性**——成品网页提供"测试连接"按钮，调用成功后才启用智能排程入口

#### 2.3.3 小圈子多用户

- 已通过 Supabase Auth + RLS 支持
- 新增：用户头像、个人资料页

---

## 3. 非功能性需求

### 3.1 性能

- 首屏加载 < 2s（Vercel CDN）
- 数据库查询响应 < 200ms（Supabase 免费 tier）
- 客户端操作无明显卡顿

### 3.2 安全

- 行级安全 (RLS)：所有用户数据表加 `user_id = auth.uid()` 策略
- API Route 服务端密钥不暴露到前端
- 输入校验：所有用户输入经 zod 校验
- SQL 注入防护：通过 Supabase SDK 参数化查询

### 3.3 可用性

- 响应式：桌面 + 移动浏览器自适应
- PWA：可安装到桌面 / 手机主屏，离线可查看缓存数据
- 深色模式

### 3.4 可维护性

- TypeScript 全栈类型
- 组件目录按功能划分
- 关键逻辑加注释

---

## 4. 架构

### 4.1 技术栈

| 层 | 选型 |
|---|---|
| 前端框架 | Next.js 14 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| 日历 | react-big-calendar |
| 状态 | TanStack Query + Zustand |
| 表单 | react-hook-form + zod |
| BaaS | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| 部署 | Vercel (前端) + Supabase (后端) |
| PWA | next-pwa |

### 4.2 数据流

```
浏览器 (Next.js 前端 + PWA)
  ↓ Supabase JS SDK (受 RLS 约束)
Supabase PostgreSQL
  ↑ Realtime 订阅
浏览器其他设备
```

- 客户端通过 Supabase JS SDK 直接读写数据库（受 RLS 约束）
- 多设备实时同步通过 Supabase Realtime
- 服务端密钥操作（如 AI 调用、邮件发送）走 Next.js API Route

### 4.3 部署拓扑

```
用户浏览器 (PWA 可装)
  ↓ HTTPS
Vercel Edge (前端静态资源 + API Route)
  ↓
Supabase (海外节点, 免费 tier)
```

---

## 5. 数据模型

### 5.1 表结构

```sql
-- 用户档案
profiles (
  id uuid PK references auth.users,
  email text,
  display_name text,
  preferences jsonb,        -- { defaultView, theme, pomodoroDuration, ... }
  created_at timestamptz
)

-- 考试项目
exams (
  id uuid PK default gen_random_uuid(),
  user_id uuid FK references profiles(id),
  name text,
  exam_date date,
  phase_ranges jsonb,       -- { basic: [start,end], intensive: [...], sprint: [...] }
  created_at timestamptz
)

-- 分类
categories (
  id uuid PK default gen_random_uuid(),
  user_id uuid FK,
  name text,
  color text
)

-- 任务
tasks (
  id uuid PK default gen_random_uuid(),
  user_id uuid FK,
  exam_id uuid FK nullable,
  category_id uuid FK nullable,
  title text,
  description text,
  priority text,            -- 'low' | 'medium' | 'high'
  status text,              -- 'todo' | 'in_progress' | 'done'
  due_date date,
  created_at timestamptz,
  updated_at timestamptz
)

-- 时间块
time_blocks (
  id uuid PK default gen_random_uuid(),
  user_id uuid FK,
  task_id uuid FK nullable,
  title text,
  start_time timestamptz,
  end_time timestamptz,
  color text,
  created_at timestamptz
)

-- 抽认卡 (Phase 2)
flashcards (
  id uuid PK default gen_random_uuid(),
  user_id uuid FK,
  exam_id uuid FK nullable,
  front text,
  back text,
  tags text[],
  status text default 'new',   -- 'new' | 'reviewed'
  created_at timestamptz
)
```

### 5.2 RLS 策略

所有表均启用 RLS，统一策略模板：

```sql
CREATE POLICY "用户只能看自己的数据" ON tasks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "用户只能改自己的数据" ON tasks
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- 同样模式应用于 exams / categories / time_blocks / flashcards
```

`profiles` 表特殊：`id = auth.uid()`。

---

## 6. 前端组件结构

```
study-planner/
  app/
    (auth)/
      login/page.tsx
      register/page.tsx
      forgot-password/page.tsx
    (main)/
      calendar/page.tsx        # 月/周/日视图
      tasks/page.tsx           # 任务清单
      timer/page.tsx           # 计时器
      flashcards/page.tsx      # Phase 2
      reader/page.tsx          # Phase 2: TTS 朗读
      settings/page.tsx        # 偏好设置 + 数据导出
    api/
      suggest-schedule/route.ts  # Phase 3: AI 排程
  components/
    auth/
    calendar/
      MonthView.tsx
      WeekView.tsx
      DayView.tsx
    tasks/
      TaskList.tsx
      TaskCard.tsx
      TaskForm.tsx
    time-blocks/
      TimeBlockDraggable.tsx
    timer/
      PomodoroTimer.tsx
    flashcards/
      FlashcardView.tsx
    reader/
      TTSPlayer.tsx
    settings/
      AIConfigForm.tsx          # Phase 3: 用户填 LLM API 配置
    ui/                         # shadcn 基础组件
  lib/
    supabase/
      client.ts                 # 浏览器侧 client
      server.ts                 # API Route 侧 server client
      queries.ts                # React Query hooks
    hooks/
      useAuth.ts
      useTasks.ts
      useTimeBlocks.ts
      useTimer.ts
      useTTS.ts
    utils/
      export.ts                 # JSON 导出
      import.ts
      phase.ts                  # 学习阶段判断
      crypto.ts                 # API key 本地加解密
    ai/
      llm-client.ts             # Phase 3: OpenAI 兼容协议调用（不绑死厂商）
  public/
    manifest.json               # PWA
    icons/
  next.config.js
  tailwind.config.ts
```

---

## 7. 关键流程

### 7.1 创建任务

1. 用户在 `/tasks` 点 "新建"
2. 弹出 TaskForm，zod 校验
3. 提交 → `useTasks.create` → Supabase insert → RLS 校验 user_id
4. 成功：toast + 列表刷新（React Query invalidate）
5. 失败：toast 错误信息

### 7.2 时间块拖拽（Phase 2 起）

1. 用户在日历视图拖拽任务到时间段
2. 弹出确认对话框
3. 创建 `time_block` 关联 `task_id`
4. Realtime 同步到其他设备

### 7.3 番茄钟

1. 用户进入 `/timer`
2. 默认 25 分钟，可手动输入任意分钟
3. 点开始 → 倒计时
4. 完成 → 提示音 + 询问是否记录为时间块

### 7.4 数据导出

1. 用户在 `/settings` 点 "导出数据"
2. 前端拉取所有用户数据（tasks、time_blocks、exams、flashcards、categories）
3. 序列化为 JSON，触发下载
4. 文件名：`study-planner-backup-YYYY-MM-DD.json`

### 7.5 TTS 朗读（Phase 2）

1. 用户进入 `/reader`，粘贴学习材料
2. 前端解析为段落
3. 选语音、语速
4. 点播放 → Web Speech API 朗读
5. 循环按键：单段循环 / 全文循环 / 关闭
6. 可最小化为背景朗读

### 7.6 抽认卡自测（Phase 2）

1. 用户进入 `/flashcards`，选择卡片集
2. 显示正面，隐藏背面
3. 用户自测后点 "显示答案"
4. 卡片状态变为 `reviewed`
5. 点 "重做" → 状态重置为 `new`

### 7.7 配置 AI 排程（Phase 3）

1. 用户进入 `/settings` → "AI 排程配置" 区域
2. 填写：提供商标签（自定义）+ Base URL + API Key + 模型名
3. 点 "测试连接" → 后端 API Route 用配置向目标 LLM 发一次 ping 请求
4. 测试通过 → 配置加密后保存到 `profiles.preferences.aiConfig`，启用 "智能排程" 入口
5. 测试失败 → toast 提示错误（401 / 超时 / 网络等），不保存配置
6. 用户在日历页点 "AI 排程" → 后端用保存的配置调用 LLM → 返回建议时间块 → 用户确认写入

---

## 8. 错误处理

- **网络错误**：React Query 全局 `onError` → toast；自动重试 3 次
- **认证失效**：401 → 自动跳转登录页
- **表单校验**：react-hook-form + zod，实时反馈
- **RLS 拒绝**：toast "无权访问"
- **TTS 不可用**：浏览器不支持 Web Speech API 时隐藏 Reader 入口，提示用 Chrome / Edge
- **数据导出失败**：toast + 重试按钮

---

## 9. 测试策略

### 9.1 单元测试 (Vitest)

- `lib/utils/phase.ts`：阶段判断算法
- `lib/utils/export.ts`：JSON 序列化
- `lib/hooks`：useTasks、useTimer 核心逻辑

### 9.2 E2E 测试 (Playwright)

关键流程覆盖：

- 注册 → 登录 → 创建任务 → 在日历看到
- 番茄钟启动 → 完成
- 导出 → 文件下载
- TTS 播放（mock SpeechSynthesis）
- 抽认卡：显示答案 → 重做

---

## 10. 阶段交付计划

### Phase 1 — MVP

- 项目初始化 + Supabase 配置
- 认证（注册 / 登录 / 找回密码）
- 任务 CRUD + 多考试支持
- 月 / 周 / 日历视图
- 时间块手动添加
- 番茄钟（手动输入时长）
- 数据导出 / 导入 JSON
- PWA 配置

### Phase 2 — 学习辅助

- TTS 朗读页（Web Speech API）
- 抽认卡 CRUD + 自测模式
- 循环播放控制
- 时间块拖拽调整

### Phase 3 — 阶段 & AI

- 学习阶段配置 + 自动判断
- 日历按阶段着色
- MiniMax API 智能排程
- 小圈子多用户扩展

---

## 11. 不在范围内（明确排除）

- 移动端原生 App（仅做 PWA）
- 间隔重复算法（不做 Anki 那套）
- TTS 朗读历史保存
- "记住了 / 没记住" 评分按钮
- 内容来源追踪
- 服务端邮件 / 微信推送提醒（保留作为未来备选，Phase 1 不实现）

---

## 12. 待确认与风险

### 12.1 待确认

- 用户接入的 LLM API 具体是哪家（MiniMax / 智谱 / DeepSeek 等）—— 因采用 OpenAI 兼容协议，无需事先确定
- 自定义域名是否需要（前期可用 Vercel 默认域名）

### 12.2 风险

- Supabase 免费 tier 流量限制（5GB / 月）— Phase 3 扩展时观察
- iOS Safari 对 Web Speech API 的支持有限 — Reader 页加浏览器检测
- react-big-calendar 定制灵活性 — 如果时间块拖拽不顺手可能要换库或自写

---

## 13. 文档维护

- 本 spec 是项目唯一权威设计文档
- 后续大改动以新版本号追加（v1.1、v2.0…）
- 详细实施步骤计划由 writing-plans 技能基于本 spec 生成
