# 课程表导入功能 — 设计规格 (Spec)

- **版本**: 1.0
- **日期**: 2026-09-19
- **状态**: 待用户审阅
- **关联**: 主 spec `2026-09-17-study-planner-design.md` 的功能扩展

---

## 1. 概述

为学生用户提供**课程表 Excel/CSV 导入**功能。导入后课程作为固定时间块显示在日历上，与学习任务、考试、时间块共存。系统识别上课时间为占用，剩余空闲时段用于排学习任务，并预留休息和缓冲。

### 1.1 目标
- 学生从教务系统导出课表 Excel/CSV → 上传 → 自动解析入库
- 课程在日历和独立课表页两处可见
- 排学习任务时自动绕开上课时间、假期、休息标记
- 每个学习块之间留缓冲，节奏宽松

---

## 2. 导入方式

### 2.1 文件格式
- 支持 `.xlsx`、`.xls`、`.csv`
- 解析库：SheetJS (xlsx) 纯前端，离线可用，无需后端

### 2.2 导入流程
1. 用户在 `/schedule` 页点"导入课表"→ 选文件
2. 前端用 SheetJS 解析为二维数组
3. **列映射界面**：自动探测表头，展示下拉框让用户确认"课程名列 / 老师列 / 教室列 / 时间列"对应哪一列（教务系统格式不一，这步保证兼容）
4. 解析出课程列表，预览表格（课程名/老师/教室/周几/节次/起止周）
5. 用户确认 → 批量写入 `courses` + `course_sessions` 表

### 2.3 时间解析
- 教务系统常见两种：① 周几+第几节（如 周一 第3-4节）② 具体时间（如 10:00-11:40）
- 内置"节次→时间"映射表（第1节=8:00-8:45...），用户可在设置里调本校节次时间
- 起止周：解析"1-16周"格式，生成该课程在哪些周生效

---

## 3. 数据模型

### 3.1 新增表

```sql
-- 课程（一门课一条）
courses (
  id uuid PK default gen_random_uuid(),
  user_id uuid FK references profiles(id),
  name text NOT NULL,
  teacher text,
  color text default '#5C8A6B',   -- 默认森林绿，区别于任务色
  start_week int,                 -- 起始周（如 1）
  end_week int,                   -- 结束周（如 16）
  created_at timestamptz default now()
)

-- 课时（一门课每周几第几节，一条记录）
course_sessions (
  id uuid PK default gen_random_uuid(),
  course_id uuid FK references courses(id) ON DELETE CASCADE,
  user_id uuid FK references profiles(id),
  weekday int NOT NULL,           -- 0=周日 ... 6=周六
  period_start int,               -- 第几节开始
  period_end int,                 -- 第几节结束
  start_time time,                -- 解析后的具体时间（冗余，方便查询）
  end_time time,
  classroom text,
  created_at timestamptz default now()
)

-- 假期/休息标记
holidays (
  id uuid PK default gen_random_uuid(),
  user_id uuid FK references profiles(id),
  name text NOT NULL,            -- "国庆"、"校运会"
  start_date date NOT NULL,
  end_date date NOT NULL,
  type text default 'holiday'    -- holiday | rest
)
```

### 3.2 节次时间映射
存在 `profiles.preferences.periodTimes`：
```json
{"1": ["08:00","08:45"], "2": ["08:55","09:40"], ...}
```
默认值见上，用户可在设置页改。

### 3.3 RLS
同主 spec 模板，`user_id = auth.uid()` 全表。

---

## 4. UI 设计

### 4.1 新增 `/schedule` 课表页
- **周课表网格**：7列（周一到周日）× 12行（第1-12节）
- 每格显示课程名+教室，按 `courses.color` 填色
- 顶部"导入课表"按钮 + "导出模板"按钮（下载空模板填）
- 空状态："还没有课表，导入 Excel 开始"

### 4.2 日历集成
- 课程作为时间块出现在日历周/日视图
- 课程色 = 森林绿系（`#5C8A6B`），区别于任务（陶土棕/橄榄/鼠尾草）
- 月视图课程显示为小绿点 + 课程名
- 课程块不可拖拽（固定时间），时间块可拖拽

### 4.3 导入弹窗
- Step 1 选文件
- Step 2 列映射（自动探测+下拉确认）
- Step 3 预览表格 + 确认导入
- 失败行标红，显示原因，可跳过

### 4.4 设置页新增
- "学期假期"区：列表+添加（名称+起止日）
- "节次时间"区：12 个节次的起止时间编辑

---

## 5. 排程逻辑

### 5.1 占用检测
某天空闲检测函数：
1. 查当天 `course_sessions`（按本周是否在 `start_week~end_week`）
2. 查当天 `holidays`（命中则整天占用）
3. 查当天手动标记的"休息"时间块
4. 剩余时段 = 24h 减去上述占用

### 5.2 半自动建议
- 用户在日历点"智能排程"→ 系统读未完成任务列表
- 按优先级（高→低）在空闲时段插入学习时间块
- 规则：
  - 每个学习块 25-50 分钟
  - 块之间留 15-30 分钟缓冲
  - 12:00-13:00 / 18:00-19:00 默认吃饭不排
  - 22:00 后不排（避免熬夜）
- 生成预览，用户确认才写入 `time_blocks`

### 5.3 假期处理
- 假期内课程自动屏蔽（不显示、不占用）
- 假期内不触发智能排程
- 用户仍可手动在假期加时间块

---

## 6. 技术要点

- SheetJS 通过 `pnpm add xlsx` 安装
- 导入解析纯前端，写入走 Supabase SDK
- 列映射用 zod schema 校验
- 节次时间映射作为常量 + 用户可覆盖

---

## 7. 不在范围内
- OCR 图片识别（留 Phase 后续）
- 课程表模板下载（先不做，用户直接用教务系统导出）
- 调课/单周课表差异（先按整学期一致处理）
- 课程作业自动关联（后续）
