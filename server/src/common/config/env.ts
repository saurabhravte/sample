import "dotenv/config";
import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  API_ORIGIN: z.string().url().default("http://localhost:4000"),
  DATABASE_URL: z.string().min(1),
  CORSAIR_KEK: z.string().min(32, "Run: openssl rand -base64 32"),
  SESSION_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GOOGLE_REDIRECT_URI: z.string().default("http://localhost:4000/api/auth/google/callback"),
  SLACK_CLIENT_ID: z.string().default(""),
  SLACK_CLIENT_SECRET: z.string().default(""),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  ANTHROPIC_API_KEY: z.string().default(""),
  OPENROUTER_API_KEY: z.string().default(""),
  AI_FREE_MODEL: z.string().default("meta-llama/llama-3.1-8b-instruct:free"),
  AI_CLASSIFIER_MODEL: z.string().default("claude-haiku-4-5-20251001"),
  AI_AGENT_MODEL: z.string().default("claude-sonnet-4-6"),
  WEBHOOK_PUBLIC_URL: z.string().default(""),
  WEBHOOK_SIGNING_SECRET: z.string().default(""),
});

const parsed = Env.safeParse(process.env);
if (!parsed.success) {
  // Log keys only, never values.
  console.error("Invalid environment:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
