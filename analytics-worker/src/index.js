const PATH_PATTERN = /^post:[a-zA-Z0-9_-]{1,120}$/;
const MAX_BODY_BYTES = 1024;
const MAX_ACTIVE_SECONDS = 900;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return {};
  if (!allowedOrigins(env).includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function isValidSite(site, env) {
  return site === String(env.SITE_ID || "guanzheng-blog");
}

function isValidPath(path) {
  return typeof path === "string" && PATH_PATTERN.test(path);
}

async function readPayload(request) {
  const declaredSize = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) throw new Error("请求过大");

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("请求过大");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("请求格式错误");
  }
}

async function getStats(env, site, path) {
  const row = await env.DB.prepare(
    "SELECT views, active_seconds AS activeSeconds, reading_sessions AS readingSessions FROM page_stats WHERE site_id = ? AND path = ?",
  )
    .bind(site, path)
    .first();

  const views = Number(row?.views || 0);
  const activeSeconds = Number(row?.activeSeconds || 0);
  const readingSessions = Number(row?.readingSessions || 0);
  return {
    views,
    activeSeconds,
    averageReadSeconds: readingSessions ? Math.round(activeSeconds / readingSessions) : 0,
  };
}

async function recordEvent(env, payload) {
  const { site, path, type } = payload;
  if (!isValidSite(site, env) || !isValidPath(path)) throw new Error("参数不合法");

  if (type === "view") {
    await env.DB.prepare(
      `INSERT INTO page_stats (site_id, path, views, active_seconds, reading_sessions)
       VALUES (?, ?, 1, 0, 1)
       ON CONFLICT(site_id, path) DO UPDATE SET
         views = page_stats.views + 1,
         reading_sessions = page_stats.reading_sessions + 1,
         updated_at = datetime('now')`,
    )
      .bind(site, path)
      .run();
    return;
  }

  if (type === "engagement") {
    const seconds = Math.floor(Number(payload.activeSeconds));
    if (!Number.isFinite(seconds) || seconds < 1) throw new Error("阅读时长不合法");
    const safeSeconds = Math.min(seconds, MAX_ACTIVE_SECONDS);
    await env.DB.prepare(
      `INSERT INTO page_stats (site_id, path, views, active_seconds, reading_sessions)
       VALUES (?, ?, 0, ?, 0)
       ON CONFLICT(site_id, path) DO UPDATE SET
         active_seconds = page_stats.active_seconds + excluded.active_seconds,
         updated_at = datetime('now')`,
    )
      .bind(site, path, safeSeconds)
      .run();
    return;
  }

  throw new Error("事件类型不支持");
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (cors === null) return json({ error: "来源不允许" }, 403);
    if (request.method === "POST" && !request.headers.get("Origin")) return json({ error: "缺少来源" }, 403);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/v1/stats") {
      const site = url.searchParams.get("site");
      const path = url.searchParams.get("path");
      if (!isValidSite(site, env) || !isValidPath(path)) return json({ error: "参数不合法" }, 400, cors);
      return json(await getStats(env, site, path), 200, cors);
    }

    if (request.method === "POST" && url.pathname === "/v1/events") {
      try {
        await recordEvent(env, await readPayload(request));
        return json({ ok: true }, 202, cors);
      } catch (error) {
        return json({ error: error.message || "请求失败" }, 400, cors);
      }
    }

    return json({ error: "未找到接口" }, 404, cors);
  },
};
