"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dumbbell,
  Plus,
  Trash2,
  Flame,
  CalendarCheck,
  Timer,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  addFitnessExercise,
  addFitnessRecord,
  fitnessTodayKey,
  getFitnessExercises,
  getFitnessRecords,
  removeFitnessExercise,
  removeFitnessRecord,
  type FitnessExercise,
  type FitnessRecord,
} from "@/lib/fitness";

export default function FitnessPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [exercises, setExercises] = useState<FitnessExercise[]>([]);
  const [records, setRecords] = useState<FitnessRecord[]>([]);

  // 表单状态
  const [date, setDate] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [newExercise, setNewExercise] = useState("");

  // 数据同步：本地写 + 云端拉取都会派发 data-changed
  useEffect(() => {
    const sync = () => {
      setExercises(getFitnessExercises());
      setRecords(getFitnessRecords());
    };
    sync();
    setDate(fitnessTodayKey());
    window.addEventListener("study-planner:data-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("study-planner:data-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
  const weekEnd = format(
    endOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd",
  );
  const weekRecords = useMemo(
    () => records.filter((r) => r.date >= weekStart && r.date <= weekEnd),
    [records, weekStart, weekEnd],
  );

  const recentRecords = useMemo(
    () =>
      [...records]
        .sort((a, b) =>
          a.date === b.date
            ? b.createdAt.localeCompare(a.createdAt)
            : b.date.localeCompare(a.date),
        )
        .slice(0, 15),
    [records],
  );

  function handleCheckIn() {
    const exercise = exercises.find((e) => e.id === exerciseId);
    if (!exercise) {
      toast.error("请先选择动作");
      return;
    }
    if (!date) {
      toast.error("请选择日期");
      return;
    }
    const s = sets ? parseInt(sets, 10) : undefined;
    const r = reps ? parseInt(reps, 10) : undefined;
    const m = minutes ? parseInt(minutes, 10) : undefined;
    if (s === undefined && r === undefined && m === undefined) {
      toast.error("请至少填写 组数/次数 或 时长");
      return;
    }
    addFitnessRecord({
      date,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: Number.isNaN(s) ? undefined : s,
      reps: Number.isNaN(r) ? undefined : r,
      minutes: Number.isNaN(m) ? undefined : m,
      note: note.trim() || undefined,
    });
    setSets("");
    setReps("");
    setMinutes("");
    setNote("");
    toast.success(`已打卡：${exercise.name}`);
  }

  function handleAddExercise() {
    const name = newExercise.trim();
    if (!name) return;
    addFitnessExercise(name);
    setNewExercise("");
  }

  function recordSummary(r: FitnessRecord): string {
    const parts: string[] = [];
    if (r.sets && r.reps) parts.push(`${r.sets} 组 × ${r.reps} 次`);
    else if (r.sets) parts.push(`${r.sets} 组`);
    else if (r.reps) parts.push(`${r.reps} 次`);
    if (r.minutes) parts.push(`${r.minutes} 分钟`);
    return parts.join(" · ") || "—";
  }

  // 本周统计
  const weekCount = weekRecords.length;
  const weekMinutes = weekRecords.reduce((sum, r) => sum + (r.minutes ?? 0), 0);
  const weekExerciseKinds = new Set(weekRecords.map((r) => r.exerciseName))
    .size;
  const perExercise = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of weekRecords) {
      map.set(r.exerciseName, (map.get(r.exerciseName) ?? 0) + 1);
    }
    const list = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const max = list[0]?.[1] ?? 1;
    return list.map(([name, count]) => ({ name, count, pct: (count / max) * 100 }));
  }, [weekRecords]);

  if (!mounted) {
    // 骨架：静态导出预渲染时展示，避免日期类内容水合不一致
    return (
      <div className="space-y-5">
        <div className="h-8 w-40 rounded bg-muted/40" />
        <div className="h-64 rounded-lg bg-muted/30" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* 标题 */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Dumbbell className="h-6 w-6" />
          健身打卡
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          记录每天的训练，登录后自动云同步到你的账号
        </p>
      </div>

      <div className="grid gap-4 lg:gap-5 lg:grid-cols-[1fr_320px]">
        {/* 左列：打卡 + 近期记录 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">今日打卡</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fitness-date">日期</Label>
                  <Input
                    id="fitness-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fitness-exercise">动作</Label>
                  <select
                    id="fitness-exercise"
                    value={exerciseId}
                    onChange={(e) => setExerciseId(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">选择动作…</option>
                    {exercises.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="fitness-sets">组数</Label>
                  <Input
                    id="fitness-sets"
                    type="number"
                    min={1}
                    placeholder="如 3"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fitness-reps">每组次数</Label>
                  <Input
                    id="fitness-reps"
                    type="number"
                    min={1}
                    placeholder="如 12"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fitness-minutes">时长（分钟）</Label>
                  <Input
                    id="fitness-minutes"
                    type="number"
                    min={1}
                    placeholder="如 20"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fitness-note">备注（可选）</Label>
                <Input
                  id="fitness-note"
                  placeholder="状态、重量、感受…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <Button onClick={handleCheckIn} className="w-full">
                <Plus className="h-4 w-4" />
                打卡
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">近期记录</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentRecords.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  还没有打卡记录，完成第一组训练吧
                </p>
              ) : (
                recentRecords.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg border bg-background/50 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">
                          {r.exerciseName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(r.date), "M月d日 EEEE", {
                            locale: zhCN,
                          })}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {recordSummary(r)}
                        {r.note ? ` · ${r.note}` : ""}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="删除记录"
                      onClick={() => removeFitnessRecord(r.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* 右列：周统计 + 动作库 */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">本周统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/40 p-3">
                  <Flame className="mx-auto h-4 w-4 text-primary" />
                  <div className="mt-1 text-xl font-bold">{weekCount}</div>
                  <div className="text-[11px] text-muted-foreground">打卡</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <Timer className="mx-auto h-4 w-4 text-primary" />
                  <div className="mt-1 text-xl font-bold">{weekMinutes}</div>
                  <div className="text-[11px] text-muted-foreground">分钟</div>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <Layers className="mx-auto h-4 w-4 text-primary" />
                  <div className="mt-1 text-xl font-bold">
                    {weekExerciseKinds}
                  </div>
                  <div className="text-[11px] text-muted-foreground">动作</div>
                </div>
              </div>
              {perExercise.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground">
                  本周还没有训练记录
                </p>
              ) : (
                <div className="space-y-2">
                  {perExercise.map((e) => (
                    <div key={e.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span>{e.name}</span>
                        <span className="text-muted-foreground">
                          {e.count} 次
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/70"
                          style={{ width: `${e.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                <CalendarCheck className="h-3.5 w-3.5" />
                统计周期：本周一至今天
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">动作库</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {exercises.map((e) => (
                  <span
                    key={e.id}
                    className="inline-flex items-center gap-1 rounded-full bg-muted/60 py-1 pl-3 pr-1.5 text-xs"
                  >
                    {e.name}
                    <button
                      type="button"
                      aria-label={`删除动作 ${e.name}`}
                      onClick={() => removeFitnessExercise(e.id)}
                      className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {exercises.length === 0 && (
                  <span className="text-xs text-muted-foreground">
                    动作库为空，添加你的第一个动作
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="新动作名称，如 硬拉"
                  value={newExercise}
                  onChange={(e) => setNewExercise(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddExercise();
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className={cn("shrink-0")}
                  onClick={handleAddExercise}
                >
                  <Plus className="h-4 w-4" />
                  添加
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
