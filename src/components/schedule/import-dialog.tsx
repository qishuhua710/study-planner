"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, X, Check, AlertCircle, FileSpreadsheet, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  parsePeriods,
  parseWeekday,
  parseWeeks,
  generateId,
  type Course,
  type CourseSession,
  courseColorPresets,
} from "@/lib/course-storage";

// ==================== 类型 ====================

interface ParsedRow {
  rowIndex: number;
  raw: string[];
  courseName?: string;
  teacher?: string;
  classroom?: string;
  weekday?: number;
  periodStart?: number;
  periodEnd?: number;
  startWeek?: number;
  endWeek?: number;
  error?: string;
}

interface ColumnMapping {
  courseName: number; // 列下标
  teacher: number;
  classroom: number;
  weekday: number;
  periods: number;
  weeks: number;
}

const weekDayLabel = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

// ==================== 主组件 ====================

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (courses: Course[], sessions: CourseSession[]) => void;
}

export function ImportDialog({ open, onClose, onImported }: ImportDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    courseName: 0,
    teacher: -1,
    classroom: -1,
    weekday: -1,
    periods: -1,
    weeks: -1,
  });
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // 关闭时重置
  function handleClose() {
    setStep(1);
    setHeaders([]);
    setRows([]);
    setParsed([]);
    setFileName("");
    onClose();
  }

  // 删除单行（按 rowIndex）
  function handleRemoveRow(rowIndex: number) {
    setParsed((prev) => prev.filter((p) => p.rowIndex !== rowIndex));
  }

  // 一键移除所有失败行
  function handleRemoveFailed() {
    setParsed((prev) => prev.filter((p) => !p.error));
  }

  // 恢复全部行（解析前的原始数据）
  function handleRestoreAll() {
    parseAll();
  }

  // 读取文件
  async function handleFile(file: File) {
    setFileName(file.name);
    let buf = await file.arrayBuffer();

    // CSV 编码自动探测：缺 BOM 则尝试 GBK 转 UTF-8
    if (file.name.toLowerCase().endsWith(".csv")) {
      const bytes = new Uint8Array(buf);
      // 前 3 字节：EF BB BF (UTF-8 BOM)
      const hasBOM =
        bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
      if (!hasBOM) {
        // 假设为 GBK，转换成 UTF-8
        try {
          const decoder = new TextDecoder("gbk");
          const text = decoder.decode(bytes);
          buf = new TextEncoder().encode("\uFEFF" + text).buffer as ArrayBuffer;
        } catch {
          // 回退：直接用原 buffer
        }
      }
    }

    const wb = XLSX.read(buf, {
      type: "array",
      cellDates: false, // 关键："1-16" 等不会变成日期序列
      raw: false, // 显示格式化值而不是原始数字
    });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    });
    if (data.length === 0) return;
    const hdr = (data[0] as string[]).map((h) => String(h ?? "").trim());
    const body = data.slice(1).map((r) => (r as string[]).map((c) => String(c ?? "").trim()));
    setHeaders(hdr);
    setRows(body);

    // 自动探测列映射（基于常见表头关键词）
    const auto: ColumnMapping = {
      courseName: -1,
      teacher: -1,
      classroom: -1,
      weekday: -1,
      periods: -1,
      weeks: -1,
    };
    hdr.forEach((h, i) => {
      const lower = h.toLowerCase();
      if (/课程|名称|科目|course|class/i.test(h)) auto.courseName = i;
      else if (/老师|教师|teacher|授课/i.test(h)) auto.teacher = i;
      else if (/教室|地点|classroom|room/i.test(h)) auto.classroom = i;
      else if (/周|星期|weekday|day/i.test(h)) auto.weekday = i;
      else if (/节|period|节次/i.test(h)) auto.periods = i;
      else if (/周次|周数|week/i.test(h)) auto.weeks = i;
    });
    // 课程名必须存在
    if (auto.courseName < 0 && body.length > 0) {
      // 找最长的字符串列作为课程名
      let bestLen = 0;
      body.forEach((r) => {
        r.forEach((c, i) => {
          if (c.length > bestLen) {
            bestLen = c.length;
            auto.courseName = i;
          }
        });
      });
    }
    // 如果没找到周/节，尝试用任何含数字的列做兜底
    if (auto.weekday < 0) auto.weekday = -1;
    if (auto.periods < 0) auto.periods = -1;
    if (auto.weeks < 0) auto.weeks = -1;

    setMapping(auto);

    // 如果只有课程名（无周/节），把"未配的列"提示出来
    setStep(2);
  }

  // 解析所有行
  function parseAll() {
    const result: ParsedRow[] = rows.map((row, idx) => {
      const parsed: ParsedRow = { rowIndex: idx + 2, raw: row };
      const courseName = mapping.courseName >= 0 ? row[mapping.courseName] : "";
      if (!courseName) {
        parsed.error = "缺少课程名";
        return parsed;
      }
      parsed.courseName = courseName.trim();

      if (mapping.teacher >= 0) parsed.teacher = row[mapping.teacher]?.trim() || undefined;
      if (mapping.classroom >= 0) parsed.classroom = row[mapping.classroom]?.trim() || undefined;

      // 周几（如果 weekday 和 periods 指向同一列，先把 weekday 提取走再解析 periods）
      let weekdayStr = mapping.weekday >= 0 ? row[mapping.weekday] : "";
      let periodsStr = mapping.periods >= 0 ? row[mapping.periods] : "";

      // 如果两列指向同一字段，自动分离
      if (
        mapping.weekday === mapping.periods &&
        mapping.weekday >= 0 &&
        weekdayStr
      ) {
        // "周一 1-2节" → weekday="周一", periods="1-2节"
        const m = weekdayStr.match(/^(周[一二三四五六日]|星期[一二三四五六日天])(.*)/);
        if (m) {
          weekdayStr = m[1];
          periodsStr = m[2].trim();
        }
      }

      const wd = weekdayStr ? parseWeekday(weekdayStr) : null;
      if (wd === null) {
        parsed.error = `无法解析周几: "${weekdayStr}"`;
        return parsed;
      }
      parsed.weekday = wd;

      const periodList = periodsStr ? parsePeriods(periodsStr) : [];
      if (periodList.length === 0) {
        parsed.error = `无法解析节次: "${periodsStr}"`;
        return parsed;
      }
      parsed.periodStart = periodList[0].start;
      parsed.periodEnd = periodList[0].end;

      // 起止周
      const weeksStr = mapping.weeks >= 0 ? row[mapping.weeks] : "";
      if (weeksStr) {
        const wk = parseWeeks(weeksStr);
        parsed.startWeek = wk.startWeek;
        parsed.endWeek = wk.endWeek;
      } else {
        parsed.startWeek = 1;
        parsed.endWeek = 16;
      }

      return parsed;
    });
    setParsed(result);
    setStep(3);
  }

  // 确认导入
  function confirmImport() {
    const valid = parsed.filter((p) => !p.error && p.courseName);
    if (valid.length === 0) return;

    // 按课程名聚合
    const courseMap = new Map<string, Course>();
    const sessions: CourseSession[] = [];

    for (const row of valid) {
      const key = row.courseName!;
      let course = courseMap.get(key);
      if (!course) {
        course = {
          id: generateId(),
          name: key,
          teacher: row.teacher,
          color: courseColorPresets[courseMap.size % courseColorPresets.length].value,
          startWeek: row.startWeek ?? 1,
          endWeek: row.endWeek ?? 16,
        };
        courseMap.set(key, course);
      }
      // 用节次时间映射生成具体时间
      // 这里简化处理：periodStart-end 的时间从默认映射查
      const { defaultStartEnd } = computePeriodTime(row.periodStart!, row.periodEnd!);

      sessions.push({
        id: generateId(),
        courseId: course.id,
        weekday: row.weekday! as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        periodStart: row.periodStart!,
        periodEnd: row.periodEnd!,
        startTime: defaultStartEnd.startTime,
        endTime: defaultStartEnd.endTime,
        classroom: row.classroom,
      });
    }

    onImported(Array.from(courseMap.values()), sessions);
    handleClose();
  }

  // 简化版节次时间（暂用默认映射，不读 user setting）
  function computePeriodTime(start: number, end: number) {
    const map: Record<number, [string, string]> = {
      1: ["08:00", "08:45"],
      2: ["08:55", "09:40"],
      3: ["10:00", "10:45"],
      4: ["10:55", "11:40"],
      5: ["14:00", "14:45"],
      6: ["14:55", "15:40"],
      7: ["16:00", "16:45"],
      8: ["16:55", "17:40"],
      9: ["19:00", "19:45"],
      10: ["19:55", "20:40"],
      11: ["20:50", "21:35"],
      12: ["21:45", "22:30"],
    };
    return {
      defaultStartEnd: {
        startTime: map[start]?.[0] ?? "08:00",
        endTime: map[end]?.[1] ?? "09:40",
      },
    };
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card shadow-xl">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">导入课表</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {step === 1 && "选择 Excel 或 CSV 文件"}
              {step === 2 && "确认列映射（教务系统格式可能不同）"}
              {step === 3 && "预览并确认导入"}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 步骤指示 */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  step >= n
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > n ? <Check className="h-3 w-3" /> : n}
              </div>
              <span
                className={`text-xs ${
                  step >= n ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {n === 1 ? "选文件" : n === 2 ? "列映射" : "预览"}
              </span>
              {n < 3 && <div className="ml-2 h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {/* 内容 */}
        <div className="px-6 py-6">
          {step === 1 && (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium">点击选择文件</p>
              <p className="mt-1 text-xs text-muted-foreground">
                支持 .xlsx / .xls / .csv
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">· {rows.length} 行</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["courseName", "课程名", true],
                    ["teacher", "老师", false],
                    ["classroom", "教室", false],
                    ["weekday", "周几", true],
                    ["periods", "节次", true],
                    ["weeks", "起止周", false],
                  ] as const
                ).map(([key, label, required]) => (
                  <div key={key}>
                    <label className="mb-1 flex items-center gap-1 text-xs font-medium">
                      {label}
                      {required && <span className="text-destructive">*</span>}
                    </label>
                    <select
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={mapping[key]}
                      onChange={(e) =>
                        setMapping((m) => ({
                          ...m,
                          [key]: parseInt(e.target.value, 10),
                        }))
                      }
                    >
                      <option value={-1}>— 无 —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          第{i + 1}列：{h || "(无标题)"}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* 表头预览 */}
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40">
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium">
                          {h || `列${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 3).map((row, i) => (
                      <tr key={i} className="border-t">
                        {row.map((c, j) => (
                          <td key={j} className="px-3 py-2">
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 3 && (
                  <div className="border-t bg-muted/20 px-3 py-1.5 text-center text-xs text-muted-foreground">
                    还有 {rows.length - 3} 行…
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {/* 统计 + 批量操作 */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span>共 {parsed.length} 行</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-medium text-primary">
                    {parsed.filter((p) => !p.error).length} 行有效
                  </span>
                  {parsed.some((p) => p.error) && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-destructive">
                        {parsed.filter((p) => p.error).length} 行失败
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {parsed.some((p) => p.error) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFailed}
                      className="h-7 gap-1 px-2 text-xs"
                    >
                      <Filter className="h-3 w-3" /> 仅保留有效行
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRestoreAll}
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  >
                    恢复全部
                  </Button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/40">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">行</th>
                      <th className="px-3 py-2 text-left font-medium">课程</th>
                      <th className="px-3 py-2 text-left font-medium">老师</th>
                      <th className="px-3 py-2 text-left font-medium">教室</th>
                      <th className="px-3 py-2 text-left font-medium">时间</th>
                      <th className="px-3 py-2 text-left font-medium">周次</th>
                      <th className="px-3 py-2 text-left font-medium">状态</th>
                      <th className="px-2 py-2 text-center font-medium">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          所有行都已删除
                        </td>
                      </tr>
                    ) : (
                      parsed.map((row) => (
                        <tr
                          key={row.rowIndex}
                          className={`border-t transition-colors hover:bg-muted/30 ${
                            row.error ? "bg-destructive/5" : ""
                          }`}
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.rowIndex}
                          </td>
                          <td className="px-3 py-2 font-medium">
                            {row.courseName ?? "—"}
                          </td>
                          <td className="px-3 py-2">{row.teacher ?? "—"}</td>
                          <td className="px-3 py-2">
                            {row.classroom ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            {row.weekday !== undefined && row.periodStart !== undefined
                              ? `${weekDayLabel[row.weekday]} 第${row.periodStart}-${
                                  row.periodEnd === row.periodStart
                                    ? row.periodStart
                                    : row.periodEnd
                                }节`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {row.startWeek !== undefined
                              ? `${row.startWeek}-${row.endWeek}周`
                              : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {row.error ? (
                              <span className="flex items-center gap-1 text-destructive">
                                <AlertCircle className="h-3 w-3" />
                                <span className="truncate">{row.error}</span>
                              </span>
                            ) : (
                              <span className="text-primary">✓</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              onClick={() => handleRemoveRow(row.rowIndex)}
                              title="删除此行"
                              aria-label={`删除第 ${row.rowIndex} 行`}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-end gap-2 border-t bg-muted/20 px-6 py-4">
          {step > 1 && (
            <Button variant="ghost" size="sm" onClick={() => setStep((s) => (s - 1) as 1 | 2)}>
              上一步
            </Button>
          )}
          {step === 2 && (
            <Button size="sm" onClick={parseAll}>
              解析预览
            </Button>
          )}
          {step === 3 && (
            <Button
              size="sm"
              onClick={confirmImport}
              disabled={parsed.filter((p) => !p.error).length === 0}
            >
              确认导入 ({parsed.filter((p) => !p.error).length} 条)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
