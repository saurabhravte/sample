/**
 * Backend latency budget check — fails CI if the API gets slow.
 *
 * Boots nothing itself: expects the API to already be listening (CI starts it).
 * Measures wall-clock latency for the endpoints a user hits constantly and
 * asserts p95 budgets. Auth endpoints get a higher budget because argon2id is
 * intentionally slow.
 *
 * Usage: node scripts/perf-check.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? process.env.PERF_BASE_URL ?? "http://localhost:4000";
const RUNS = Number(process.env.PERF_RUNS ?? 30);

const email = `perf-${Date.now()}@momentum.test`;
const password = "perf-check-password-123";
let cookie = "";

async function call(method, path, body) {
  const t0 = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const ms = performance.now() - t0;
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  await res.arrayBuffer(); // drain
  return { ms, status: res.status };
}

function p95(samples) {
  const s = [...samples].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(s.length * 0.95) - 1)];
}

async function bench(name, fn, { runs = RUNS, budgetMs, warmup = 3 }) {
  for (let i = 0; i < warmup; i++) await fn();
  const samples = [];
  for (let i = 0; i < runs; i++) samples.push((await fn()).ms);
  const stats = {
    name,
    p50: Math.round(
      p95(
        samples
          .slice()
          .sort((a, b) => a - b)
          .slice(0, Math.ceil(samples.length / 2)),
      ),
    ),
    p95: Math.round(p95(samples)),
    max: Math.round(Math.max(...samples)),
    budgetMs,
  };
  const pass = stats.p95 <= budgetMs;
  console.log(
    `${pass ? "✅" : "❌"} ${name.padEnd(28)} p95=${String(stats.p95).padStart(5)}ms  max=${String(stats.max).padStart(5)}ms  budget=${budgetMs}ms`,
  );
  return pass;
}

async function waitForApi(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/healthz`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`API at ${BASE} did not become healthy in ${timeoutMs}ms`);
}

const main = async () => {
  console.log(`\nMomentum perf budgets → ${BASE} (${RUNS} runs/endpoint)\n`);
  await waitForApi();

  // One-time setup: a real user + session cookie.
  const reg = await call("POST", "/api/auth/register", { email, password, name: "Perf Bot" });
  if (reg.status >= 400) throw new Error(`register failed: ${reg.status}`);

  const results = [];
  results.push(await bench("GET  /healthz", () => call("GET", "/healthz"), { budgetMs: 50 }));
  results.push(await bench("GET  /api/auth/me", () => call("GET", "/api/auth/me"), { budgetMs: 120 }));
  results.push(
    await bench("POST /api/auth/login (argon2)", () => call("POST", "/api/auth/login", { email, password }), {
      runs: 8,
      warmup: 1,
      budgetMs: 1500, // argon2id is supposed to be slow; budget catches regressions, not the hash itself
    }),
  );
  results.push(await bench("GET  /api/inbox", () => call("GET", "/api/inbox"), { budgetMs: 250 }));
  results.push(await bench("GET  /api/tasks", () => call("GET", "/api/tasks"), { budgetMs: 250 }));
  results.push(await bench("GET  /api/connections", () => call("GET", "/api/connections"), { budgetMs: 300 }));

  if (results.includes(false)) {
    console.error("\n❌ Latency budget exceeded — backend is slower than allowed.\n");
    process.exit(1);
  }
  console.log("\n✅ All latency budgets met.\n");
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
