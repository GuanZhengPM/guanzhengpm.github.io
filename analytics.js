import { analyticsConfig } from "./analytics.config.js";

const endpoint = analyticsConfig.endpoint.replace(/\/$/, "");
export const analyticsEnabled = Boolean(endpoint && analyticsConfig.siteId);

function keyIsValid(key) {
  return typeof key === "string" && /^[a-zA-Z0-9:_-]{1,140}$/.test(key);
}

function eventUrl() {
  return `${endpoint}/v1/events`;
}

function statsUrl(pageKey) {
  const params = new URLSearchParams({ site: analyticsConfig.siteId, path: pageKey });
  return `${endpoint}/v1/stats?${params.toString()}`;
}

async function sendEvent(payload, keepalive = false) {
  if (!analyticsEnabled || !keyIsValid(payload.path)) return;

  const body = JSON.stringify({ site: analyticsConfig.siteId, ...payload });
  if (keepalive && navigator.sendBeacon) {
    const queued = navigator.sendBeacon(eventUrl(), new Blob([body], { type: "text/plain;charset=UTF-8" }));
    if (queued) return;
  }

  const response = await fetch(eventUrl(), {
    method: "POST",
    mode: "cors",
    credentials: "omit",
    keepalive,
    headers: { "Content-Type": "application/json" },
    body,
  });
  if (!response.ok) throw new Error("统计请求失败");
}

export async function trackPageView(pageKey) {
  if (!analyticsEnabled || !keyIsValid(pageKey)) return;
  const storageKey = `guanzheng-pv:${pageKey}`;
  if (sessionStorage.getItem(storageKey)) return;
  sessionStorage.setItem(storageKey, "1");

  try {
    await sendEvent({ type: "view", path: pageKey });
  } catch {
    // 统计不可用时不影响博客阅读。
  }
}

export async function getPageStats(pageKey) {
  if (!analyticsEnabled || !keyIsValid(pageKey)) return null;

  try {
    const response = await fetch(statsUrl(pageKey), {
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export function startReadingTimer(pageKey) {
  if (!analyticsEnabled || !keyIsValid(pageKey)) return () => {};

  const isActive = () => document.visibilityState === "visible" && document.hasFocus();
  let activeSince = isActive() ? performance.now() : null;
  let activeMs = 0;
  let reportedSeconds = 0;
  let stopped = false;

  const addActiveTime = () => {
    if (activeSince === null) return;
    const now = performance.now();
    activeMs += now - activeSince;
    activeSince = now;
  };

  const pause = () => {
    addActiveTime();
    activeSince = null;
  };

  const resume = () => {
    if (activeSince === null && isActive()) activeSince = performance.now();
  };

  const report = () => {
    const totalSeconds = Math.floor(activeMs / 1000);
    const deltaSeconds = totalSeconds - reportedSeconds;
    if (deltaSeconds < 5) return;
    reportedSeconds = totalSeconds;
    void sendEvent({ type: "engagement", path: pageKey, activeSeconds: deltaSeconds }, true);
  };

  const onVisibilityChange = () => {
    if (!isActive()) {
      pause();
      report();
      return;
    }
    resume();
  };

  const onFocus = () => resume();
  const onBlur = () => {
    pause();
    report();
  };

  const onPageHide = () => {
    pause();
    report();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onFocus);
  window.addEventListener("blur", onBlur);
  window.addEventListener("pagehide", onPageHide, { once: true });
  const interval = window.setInterval(report, 15000);

  return () => {
    if (stopped) return;
    stopped = true;
    pause();
    report();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("pagehide", onPageHide);
    window.clearInterval(interval);
  };
}
