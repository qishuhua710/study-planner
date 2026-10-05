"use client";

import { useState, useEffect, useMemo } from "react";
import { Upload, FileDown, BookOpen, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportDialog } from "@/components/schedule/import-dialog";
import {
  getCourses,
  getSessions,
  getHolidays,
  getPeriodTimes,
  replaceAllCourses,
  type Course,
  type CourseSession,
  type Weekday,
} from "@/lib/course-storage";
import { getCurrentWeekNumber } from "@/lib/course-storage";

const weekDayLabel = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const weekDayShort = ["日", "一", "二", "三", "四", "五", "六"];

// 周课表从周一开始
const DISPLAY_WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export default function SchedulePage() {
  const [importOpen, setImportOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [holidays, setHolidays] = useState(getHolidays());
  const periodTimes = getPeriodTimes();
  const currentWeek = useMemo(() => getCurrentWeekNumber(), []);
  const [refreshKey, setRefreshKey] = useState(0);

  // 初始加载 + 每次操作后刷新
  useEffect(() => {
    setCourses(getCourses());
    setSessions(getSessions());
    setHolidays(getHolidays());
  }, [refreshKey]);

  // 课程索引：weekday → period → session + course
  const cellIndex = useMemo(() => {
    const idx = new Map<string, { session: CourseSession; course: Course }>();
    for (const session of sessions) {
      const course = courses.find((c) => c.id === session.courseId);
      if (!course) continue;
      if (currentWeek < course.startWeek || currentWeek > course.endWeek) continue;
      const key = `${session.weekday}-${session.periodStart}`;
      idx.set(key, { session, course });
    }
    return idx;
  }, [sessions, courses, currentWeek]);

  const sessionCount = sessions.length;
  const totalCourses = courses.length;

  function handleImported(newCourses: Course[], newSessions: CourseSession[]) {
    replaceAllCourses(newCourses, newSessions);
    setRefreshKey((k) => k + 1);
  }

  function downloadTemplate() {
    // 下载 CSV 模板
    const csv = [
      "课程名,老师,教室,周几,节次,起止周",
      "高等数学,张老师,A101,周一,1-2,1-16",
      "数字逻辑,李老师,B203,周二,3-4,1-16",
      "大学英语,王老师,C305,周三,5-6,1-16",
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "课表导入模板.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // 节次时段显示文本
  const periods = Object.keys(periodTimes)
    .map((k) => parseInt(k, 10))
    .sort((a, b) => a - b);

  // 合并连续节次（同一门课连续 3-4 节显示为一个块）
  function mergeSessionsForDay(weekday: Weekday) {
    const list: Array<{
      course: Course;
      startPeriod: number;
      endPeriod: number;
      classroom?: string;
    }> = [];
    const dayPeriods = new Set<number>();
    for (const p of periods) dayPeriods.add(p);

    // 收集该天所有 session，按 startPeriod 排序
    type DaySession = {
      session: CourseSession;
      course: Course;
    };
    const daySessions: DaySession[] = sessions
      .filter((s) => s.weekday === weekday)
      .map((s): DaySession | null => {
        const course = courses.find((c) => c.id === s.courseId);
        if (!course) return null;
        if (currentWeek < course.startWeek || currentWeek > course.endWeek) return null;
        return { session: s, course };
      })
      .filter((x): x is DaySession => x !== null)
      .sort((a, b) => a.session.periodStart - b.session.periodStart);

    for (const { session, course } of daySessions) {
      // 尝试合并到上一个块
      const last = list[list.length - 1];
      if (
        last &&
        last.course.id === course.id &&
        last.endPeriod + 1 === session.periodStart &&
        last.classroom === session.classroom
      ) {
        last.endPeriod = session.periodEnd;
      } else {
        list.push({
          course,
          startPeriod: session.periodStart,
          endPeriod: session.periodEnd,
          classroom: session.classroom,
        });
      }
    }
    return list;
  }

  // 计算某个合并块的行跨度（占几行）
  function getRowSpan(start: number, end: number) {
    return end - start + 1;
  }

  return (
    <div className="space-y-5">
      {/* 标题 */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">课程表</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            第 {currentWeek} 周 ·{" "}
            {totalCourses > 0
              ? `${totalCourses} 门课 · ${sessionCount} 课时`
              : "还没有课表，导入 Excel 开始"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadTemplate}
            className="gap-1.5"
          >
            <FileDown className="h-4 w-4" /> 模板
          </Button>
          <Button size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
            <Upload className="h-4 w-4" /> 导入课表
          </Button>
        </div>
      </div>

      {/* 假期提示 */}
      {holidays.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-2.5 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">本学期假期：</span>
          {holidays.map((h) => (
            <span
              key={h.id}
              className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {h.name} {h.startDate.slice(5)}-{h.endDate.slice(5)}
            </span>
          ))}
        </div>
      )}

      {/* 空状态 */}
      {totalCourses === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-20">
          <BookOpen className="mb-3 h-12 w-12 text-muted-foreground/30" />
          <p className="text-sm font-medium">还没有课表</p>
          <p className="mt-1 text-xs text-muted-foreground">
            从教务系统导出 Excel / CSV，上传即可
          </p>
          <Button
            size="sm"
            className="mt-4 gap-1.5"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-4 w-4" /> 立即导入
          </Button>
        </div>
      ) : (
        /* 周课表网格 */
        <div className="overflow-x-auto rounded-2xl bg-card shadow-sm">
          <div className="min-w-[720px]">
            {/* 表头：周一-周日 */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
              <div className="px-2 py-3 text-center text-xs font-medium text-muted-foreground">
                节次
              </div>
              {DISPLAY_WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="border-l px-2 py-3 text-center text-xs font-medium"
                >
                  <span
                    className={
                      wd === 0 || wd === 6 ? "text-muted-foreground/60" : ""
                    }
                  >
                    {weekDayLabel[wd]}
                  </span>
                </div>
              ))}
            </div>

            {/* 节次行 */}
            {periods.map((p) => {
              const timeText = periodTimes[p];
              return (
                <div
                  key={p}
                  className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0"
                >
                  {/* 节次标 */}
                  <div className="flex flex-col items-center justify-center bg-muted/20 py-2 text-center">
                    <span className="text-sm font-semibold">{p}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {timeText?.[0]}
                    </span>
                  </div>
                  {/* 各天该节次 */}
                  {DISPLAY_WEEKDAYS.map((wd) => {
                    const cell = cellIndex.get(`${wd}-${p}`);
                    return (
                      <div
                        key={wd}
                        className="min-h-[52px] border-l px-1.5 py-1"
                      >
                        {cell && (
                          <div
                            className="rounded-md px-2 py-1 text-[11px] leading-tight"
                            style={{
                              backgroundColor: `${cell.course.color}22`,
                              borderLeft: `2px solid ${cell.course.color}`,
                            }}
                          >
                            <div
                              className="truncate font-medium"
                              style={{ color: cell.course.color }}
                            >
                              {cell.course.name}
                            </div>
                            {cell.session.classroom && (
                              <div className="truncate text-muted-foreground/80">
                                @ {cell.session.classroom}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 课程详情列表 */}
      {totalCourses > 0 && (
        <div className="rounded-2xl bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">本学期课程</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {courses.map((course) => {
              const courseSessions = sessions.filter((s) => s.courseId === course.id);
              return (
                <div
                  key={course.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <span
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: course.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{course.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {course.teacher && `${course.teacher} · `}
                      {courseSessions.length} 次/周 · 第 {course.startWeek}-{course.endWeek} 周
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />
    </div>
  );
}
