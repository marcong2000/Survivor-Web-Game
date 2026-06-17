import { Hono } from "hono";

/**
 * Cloudflare Worker API. Phase 0 ships only a health check; account auth
 * (Google OAuth) and save load/store against D1 land in Phase 5.
 */
export interface Env {
  // DB: D1Database;        // bound in Phase 5
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true, service: "survivor-worker" }));

export default app;
