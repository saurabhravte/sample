Vitest picks up *.test.ts automatically. Pure-logic suites always run;
tenant-isolation runs when DATABASE_URL is set (CI does this via the
postgres service container — see .github/workflows/ci.yml).
