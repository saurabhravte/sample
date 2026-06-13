/**
 * One-shot migration for Corsair's four tables (from docs.corsair.dev quick-start)
 * plus the pgvector extension Momentum uses for local semantic search.
 */
import "dotenv/config";
import { Pool } from "pg";

const sql = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS corsair_integrations (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  dek TEXT NULL
);
CREATE TABLE IF NOT EXISTS corsair_accounts (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT NOT NULL,
  integration_id TEXT NOT NULL REFERENCES corsair_integrations(id),
  config JSONB NOT NULL DEFAULT '{}',
  dek TEXT NULL
);
CREATE TABLE IF NOT EXISTS corsair_entities (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  account_id TEXT NOT NULL REFERENCES corsair_accounts(id),
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  version TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS corsair_events (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  account_id TEXT NOT NULL REFERENCES corsair_accounts(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT
);
CREATE INDEX IF NOT EXISTS idx_corsair_accounts_tenant ON corsair_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_corsair_entities_account_type ON corsair_entities(account_id, entity_type);
`;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool
  .query(sql)
  .then(() => {
    console.log("Corsair tables + pgvector ready");
    return pool.end();
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
