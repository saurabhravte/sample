import { defineConfig } from "vitest/config";

/**
 * Unit tests must run with zero infrastructure. The env defaults below only
 * satisfy schema validation at import time — anything that actually touches
 * Postgres (tenant-isolation.test.ts) checks for a REAL DATABASE_URL and
 * skips itself otherwise. CI provides the real one.
 */
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://unit:unit@localhost:5432/unit_test_placeholder",
      SESSION_SECRET: process.env.SESSION_SECRET ?? "unit-test-session-secret-32-chars-min!!",
      CORSAIR_KEK: process.env.CORSAIR_KEK ?? "dW5pdC10ZXN0LWtlay1ub3QtZm9yLXByb2QtMTIzNDU2Nzg=",
      NODE_ENV: "test",
    },
  },
});
