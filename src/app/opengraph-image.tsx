import { ImageResponse } from "next/og";

// 路由段配置：图片元数据
export const alt = "拾光日程";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)",
          color: "white",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 160,
            height: 160,
            borderRadius: 32,
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            marginBottom: 40,
            fontSize: 100,
            fontWeight: 800,
            boxShadow: "0 20px 60px rgba(59, 130, 246, 0.4)",
          }}
        >
          拾
        </div>

        {/* 标题 */}
        <div
          style={{
            display: "flex",
            fontSize: 88,
            fontWeight: 700,
            letterSpacing: -2,
            marginBottom: 24,
            textShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          拾光日程
        </div>

        {/* 副标题 */}
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 400,
            color: "#cbd5e1",
            maxWidth: 900,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          日历 / 任务 / 计时器 / 健身打卡 / AI 排程
        </div>

        {/* 底部装饰条 */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 24,
            color: "#94a3b8",
          }}
        >
          <span>study-planner-nu-three.vercel.app</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
