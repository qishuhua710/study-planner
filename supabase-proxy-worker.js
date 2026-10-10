/**
 * Cloudflare Worker 反代 Supabase
 *
 * 解决问题：国内到 *.supabase.co 被 GFW 拦截（ERR_CONNECTION_CLOSED）
 * 解决原理：让请求走 Cloudflare Workers（国内到 Cloudflare 通），Worker 转发到 Supabase
 *
 * 部署步骤：
 * 1. 打开 https://dash.cloudflare.com -> Workers & Pages -> Create
 * 2. 选 "Create Worker"，名字自取（如 supabase-proxy-study-planner）
 * 3. 把下面整个代码粘进去，Deploy
 * 4. 拿到 Workers 域名（*.workers.dev），下面用
 *
 * 前端配置：
 *   NEXT_PUBLIC_SUPABASE_URL 改为 https://你的worker.workers.dev
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY 保持不变
 */

// 你的真实 Supabase 项目 URL（不要带尾部 /）
const SUPABASE_UPSTREAM = "https://ktkwmsapnouyulleyj.supabase.co";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS 预检请求直接放行
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // 构造上游 URL：把 workers.dev 域名换成 supabase.co
    const upstreamUrl = SUPABASE_UPSTREAM + url.pathname + url.search;

    // 转发请求
    const upstreamRequest = new Request(upstreamUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "follow",
    });

    try {
      const upstreamResponse = await fetch(upstreamRequest);

      // 复制响应，但加上 CORS 头
      const responseHeaders = new Headers(upstreamResponse.headers);
      for (const [k, v] of Object.entries(corsHeaders())) {
        responseHeaders.set(k, v);
      }

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "supabase_proxy_error",
          message: e.message,
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders(),
          },
        },
      );
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, prefer, range, x-supabase-api-version",
    "Access-Control-Max-Age": "86400",
  };
}
