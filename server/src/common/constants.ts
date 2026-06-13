/** Project-wide constants. */
export const PROJECT_NAME = "momentum";

export const SESSION_COOKIE = "momentum_session";
export const SESSION_DAYS = 14;

/** Webhook replay-protection window (seconds). */
export const MAX_SKEW_SECONDS = 300;

/** Providers that connect via OAuth (the rest use API keys). */
export const OAUTH_PROVIDERS = new Set(["gmail", "googlecalendar"]);
