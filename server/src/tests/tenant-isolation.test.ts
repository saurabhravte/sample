/**
 * THE most important test in the repo: user A must never see user B's data.
 *
 * Runs against a real Postgres (docker-compose db or Testcontainers). Skipped
 * automatically when DATABASE_URL is absent so unit runs stay green; CI sets
 * DATABASE_URL and always runs it.
 */
import { describe, expect, it, beforeAll } from "vitest";

const HAS_DB = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("unit_test_placeholder");
const d = HAS_DB ? describe : describe.skip;

d("tenant isolation", () => {
  let request: typeof import("supertest");
  let app: ReturnType<typeof import("../app").createApp>;
  let cookieA = "";
  let cookieB = "";

  beforeAll(async () => {
    request = (await import("supertest")).default as never;
    const { createApp } = await import("../app");
    app = createApp();

    const mk = async (email: string) => {
      const res = await (request as any)(app)
        .post("/api/auth/register")
        .send({
          email,
          password: "correct-horse-battery",
          name: email.split("@")[0],
          timezone: "Asia/Kolkata",
        });
      return res.headers["set-cookie"]?.[0]?.split(";")[0] ?? "";
    };
    cookieA = await mk(`a-${Date.now()}@test.dev`);
    cookieB = await mk(`b-${Date.now()}@test.dev`);

    // Seed a task for B
    await (request as any)(app)
      .post("/api/tasks")
      .set("Cookie", cookieB)
      .send({ title: "B's secret task", source: "manual" });
  });

  it("A's task list never contains B's tasks", async () => {
    const res = await (request as any)(app).get("/api/tasks").set("Cookie", cookieA);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("B's secret task");
  });

  it("A cannot mutate B's task by id", async () => {
    const list = await (request as any)(app).get("/api/tasks").set("Cookie", cookieB);
    const bTaskId = list.body.data[0].id;
    const res = await (request as any)(app)
      .patch(`/api/tasks/${bTaskId}`)
      .set("Cookie", cookieA)
      .send({ status: "done" });
    expect([403, 404]).toContain(res.status);
  });

  it("every protected route rejects unauthenticated requests", async () => {
    const routes = [
      ["get", "/api/tasks"],
      ["get", "/api/inbox"],
      ["get", "/api/connections"],
      ["get", "/api/catch-up"],
      ["post", "/api/command"],
      ["post", "/api/search"],
      ["get", "/api/calendar/events?from=2026-01-01T00:00:00Z&to=2026-01-02T00:00:00Z"],
    ] as const;
    for (const [method, path] of routes) {
      const res = await (request as any)(app)[method](path).send({});
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });
});
