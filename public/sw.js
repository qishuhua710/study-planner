/**
 * 学习日程 PWA Service Worker
 *
 * 缓存策略：
 * - 导航请求（HTML）：network-first，回退到 cache
 * - 静态资源（JS/CSS/字体/图标）：cache-first
 * - API 请求：network-first（不缓存以避免脏数据）
 *
 * 版本：v2
 */

const CACHE_VERSION = "v2";
const STATIC_CACHE = `study-planner-static-${CACHE_VERSION}`;
const PAGES_CACHE = `study-planner-pages-${CACHE_VERSION}`;

// 预缓存关键资源（next.config.mjs 启用了 trailingSlash，所以全部带 /）
const PRECACHE_URLS = [
  "/",
  "/calendar/",
  "/tasks/",
  "/schedule/",
  "/timer/",
  "/settings/",
  "/login/",
  "/register/",
  "/forgot-password/",
  "/manifest.json",
  "/icons/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES_CACHE);
      // addAll 失败也不会中断安装
      try {
        await cache.addAll(PRECACHE_URLS);
      } catch (e) {
        // 静默失败：首次安装时部分页面可能 404
      }
      await self.skipWaiting();
    })(),
  );
});

// 监听客户端消息：SKIP_WAITING 触发激活
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 清理旧版本缓存
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // 只处理 GET 请求
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // 跨域请求直接走网络
  if (url.origin !== self.location.origin) return;

  // API/数据请求：network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // 导航请求（HTML）：network-first，回退 cache
  if (req.mode === "navigate") {
    event.respondWith(navigationStrategy(req));
    return;
  }

  // 静态资源（JS/CSS/字体/图片）：cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(js|css|woff2?|svg|png|jpg|jpeg|webp|gif|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // 其他：network-first
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) {
    // 后台异步更新
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) cache.put(req, res.clone());
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.status === 200) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    const cache = await caches.open(PAGES_CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response("Offline", { status: 503 });
  }
}

async function navigationStrategy(req) {
  // 导航请求：先网络，失败后从缓存中找最接近的页面
  try {
    const res = await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    const cache = await caches.open(PAGES_CACHE);
    // 精确匹配
    const exact = await cache.match(req);
    if (exact) return exact;
    // 回退到首页
    const fallback = await cache.match("/calendar");
    if (fallback) return fallback;
    return new Response("Offline", { status: 503 });
  }
}

// 监听消息：让客户端触发 skipWaiting
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
