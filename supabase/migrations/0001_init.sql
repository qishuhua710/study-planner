-- =====================================================
-- study-planner 初始化数据库
-- 适用 Supabase 项目：ktkwmsapnouyulleyj
-- 运行方式：在 Supabase 控制台 → SQL Editor → 粘贴执行
-- =====================================================

-- 启用 UUID 生成
create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. tasks 任务表
-- =====================================================
create table if not exists public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium',
  status text not null default 'todo',
  due_date date,
  category_id text,
  category text not null default '',
  tags jsonb not null default '[]'::jsonb,
  estimated_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_user_status_idx on public.tasks(user_id, status);

-- =====================================================
-- 2. time_blocks 时间块
-- =====================================================
create table if not exists public.time_blocks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_time text not null, -- "yyyy-MM-dd HH:mm"
  end_time text not null,
  task_id text,
  color text,
  created_at timestamptz not null default now()
);

create index if not exists time_blocks_user_id_idx on public.time_blocks(user_id);

-- =====================================================
-- 3. courses 课程
-- =====================================================
create table if not exists public.courses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  teacher text,
  color text not null default '#5C8A6B',
  start_week integer not null default 1,
  end_week integer not null default 16
);

create index if not exists courses_user_id_idx on public.courses(user_id);

-- =====================================================
-- 4. course_sessions 课节
-- =====================================================
create table if not exists public.course_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  weekday integer not null,
  period_start integer not null,
  period_end integer not null,
  start_time text not null,
  end_time text not null,
  classroom text
);

create index if not exists course_sessions_user_id_idx on public.course_sessions(user_id);

-- =====================================================
-- 5. holidays 假期
-- =====================================================
create table if not exists public.holidays (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  type text not null default 'holiday'
);

create index if not exists holidays_user_id_idx on public.holidays(user_id);

-- =====================================================
-- 6. period_times 节次时间（每个用户一份）
-- =====================================================
create table if not exists public.period_times (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- =====================================================
-- 7. day_notes 日备注
-- =====================================================
create table if not exists public.day_notes (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  note text not null default '',
  starred boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- =====================================================
-- 8. categories 分类
-- =====================================================
create table if not exists public.categories (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#5C8A6B',
  created_at timestamptz not null default now()
);

create index if not exists categories_user_id_idx on public.categories(user_id);

-- =====================================================
-- 启用 RLS（Row Level Security）
-- =====================================================
alter table public.tasks enable row level security;
alter table public.time_blocks enable row level security;
alter table public.courses enable row level security;
alter table public.course_sessions enable row level security;
alter table public.holidays enable row level security;
alter table public.period_times enable row level security;
alter table public.day_notes enable row level security;
alter table public.categories enable row level security;

-- =====================================================
-- 删除旧策略（如果重新跑）
-- =====================================================
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'tasks','time_blocks','courses','course_sessions',
    'holidays','period_times','day_notes','categories'
  ]) loop
    execute format('drop policy if exists "用户只能查看自己的数据" on public.%I', t);
    execute format('drop policy if exists "用户只能插入自己的数据" on public.%I', t);
    execute format('drop policy if exists "用户只能更新自己的数据" on public.%I', t);
    execute format('drop policy if exists "用户只能删除自己的数据" on public.%I', t);
  end loop;
end $$;

-- =====================================================
-- 创建策略：每个用户只能 CRUD 自己的行
-- =====================================================

-- tasks
create policy "用户只能查看自己的数据"
  on public.tasks for select
  using (auth.uid() = user_id);
create policy "用户只能插入自己的数据"
  on public.tasks for insert
  with check (auth.uid() = user_id);
create policy "用户只能更新自己的数据"
  on public.tasks for update
  using (auth.uid() = user_id);
create policy "用户只能删除自己的数据"
  on public.tasks for delete
  using (auth.uid() = user_id);

-- time_blocks
create policy "用户只能查看自己的数据"
  on public.time_blocks for select
  using (auth.uid() = user_id);
create policy "用户只能插入自己的数据"
  on public.time_blocks for insert
  with check (auth.uid() = user_id);
create policy "用户只能更新自己的数据"
  on public.time_blocks for update
  using (auth.uid() = user_id);
create policy "用户只能删除自己的数据"
  on public.time_blocks for delete
  using (auth.uid() = user_id);

-- courses
create policy "用户只能查看自己的数据"
  on public.courses for select
  using (auth.uid() = user_id);
create policy "用户只能插入自己的数据"
  on public.courses for insert
  with check (auth.uid() = user_id);
create policy "用户只能更新自己的数据"
  on public.courses for update
  using (auth.uid() = user_id);
create policy "用户只能删除自己的数据"
  on public.courses for delete
  using (auth.uid() = user_id);

-- course_sessions
create policy "用户只能查看自己的数据"
  on public.course_sessions for select
  using (auth.uid() = user_id);
create policy "用户只能插入自己的数据"
  on public.course_sessions for insert
  with check (auth.uid() = user_id);
create policy "用户只能更新自己的数据"
  on public.course_sessions for update
  using (auth.uid() = user_id);
create policy "用户只能删除自己的数据"
  on public.course_sessions for delete
  using (auth.uid() = user_id);

-- holidays
create policy "用户只能查看自己的数据"
  on public.holidays for select
  using (auth.uid() = user_id);
create policy "用户只能插入自己的数据"
  on public.holidays for insert
  with check (auth.uid() = user_id);
create policy "用户只能更新自己的数据"
  on public.holidays for update
  using (auth.uid() = user_id);
create policy "用户只能删除自己的数据"
  on public.holidays for delete
  using (auth.uid() = user_id);

-- period_times
create policy "用户只能查看自己的数据"
  on public.period_times for select
  using (auth.uid() = user_id);
create policy "用户只能插入自己的数据"
  on public.period_times for insert
  with check (auth.uid() = user_id);
create policy "用户只能更新自己的数据"
  on public.period_times for update
  using (auth.uid() = user_id);
create policy "用户只能删除自己的数据"
  on public.period_times for delete
  using (auth.uid() = user_id);

-- day_notes
create policy "用户只能查看自己的数据"
  on public.day_notes for select
  using (auth.uid() = user_id);
create policy "用户只能插入自己的数据"
  on public.day_notes for insert
  with check (auth.uid() = user_id);
create policy "用户只能更新自己的数据"
  on public.day_notes for update
  using (auth.uid() = user_id);
create policy "用户只能删除自己的数据"
  on public.day_notes for delete
  using (auth.uid() = user_id);

-- categories
create policy "用户只能查看自己的数据"
  on public.categories for select
  using (auth.uid() = user_id);
create policy "用户只能插入自己的数据"
  on public.categories for insert
  with check (auth.uid() = user_id);
create policy "用户只能更新自己的数据"
  on public.categories for update
  using (auth.uid() = user_id);
create policy "用户只能删除自己的数据"
  on public.categories for delete
  using (auth.uid() = user_id);

-- =====================================================
-- 完成
-- =====================================================