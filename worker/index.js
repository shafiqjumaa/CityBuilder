import { onRequestPost } from "../functions/api/analyze.js";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/analyze") {
      if (request.method !== "POST") return json({ error: "استخدم POST لإرسال البرومبتات" }, 405);
      return onRequestPost({ request, env, ctx });
    }
    if (url.pathname.startsWith("/api/")) return json({ error: "المسار غير موجود" }, 404);
    return env.ASSETS.fetch(request);
  }
};
