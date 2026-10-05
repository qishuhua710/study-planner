/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA + Tauri：静态导出，产物在 out/，供 Tauri 以 file:// 加载
  output: "export",
  // 静态导出下 next/image 必须关闭优化（无服务端优化器）
  images: { unoptimized: true },
  // 生成 /path/ 形式目录，配合 file:// 与静态托管更稳
  trailingSlash: true,
};

export default nextConfig;
