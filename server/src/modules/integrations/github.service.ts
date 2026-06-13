import { corsairFor } from "../../common/config/corsair";
import { env } from "../../common/config/env";
import { fenceUntrusted, jsonCompletion } from "../../common/services/ai/llm";
import { z } from "zod";
import { logActivity } from "../../common/services/activity.service";

/** owner/repo out of https://github.com/owner/repo/pull/123 */
export function repoFromUrl(htmlUrl: string | undefined): string {
  const m = /github\.com\/([^/]+\/[^/]+)\/pull\//.exec(htmlUrl ?? "");
  return m?.[1] ?? "";
}

export async function prsAwaitingReview(userId: string) {
  const tenant = corsairFor(userId);
  // Cached locally by Corsair → instant. Rows are { entity_id, data }.
  const prs = await tenant.github.db.pullRequests.search({ data: { state: "open" }, limit: 100 });
  return prs
    .filter((p) => !p.data.draft && !p.data.merged)
    .map((p) => ({
      id: p.entity_id,
      title: p.data.title ?? "PR",
      url: p.data.htmlUrl ?? "",
      repo: repoFromUrl(p.data.htmlUrl),
      updatedAt: p.data.updatedAt ? new Date(p.data.updatedAt).toISOString() : null,
    }));
}

const Brief = z.object({ briefing: z.string().max(2000) });

export async function prBriefing(userId: string) {
  const prs = await prsAwaitingReview(userId);
  if (!prs.length) return { briefing: "No PRs are waiting on your review. 🎉", prs };
  if (!env.ANTHROPIC_API_KEY) return { briefing: `${prs.length} PR(s) awaiting review.`, prs };
  const out = await jsonCompletion({
    system: `Brief an engineer on PRs awaiting their review: what each does, suggested review order. Schema: {"briefing":"..."}`,
    user: fenceUntrusted("prs", prs.map((p) => `${p.repo}: ${p.title}`).join("\n")),
    parse: (raw) => Brief.parse(raw),
  });
  return { ...out, prs };
}

export async function createIssue(userId: string, owner: string, repo: string, title: string, body: string) {
  const tenant = corsairFor(userId);
  const issue = await tenant.github.api.issues.create({ owner, repo, title, body });
  await logActivity(userId, "automation", "github.issue_created", `Created issue “${title}” in ${owner}/${repo}`);
  return issue;
}

/** Stale-PR review reminder threshold (pure, tested). */
export function isStale(updatedAt: string | null, hours = 48): boolean {
  if (!updatedAt) return false;
  return Date.now() - new Date(updatedAt).getTime() > hours * 3_600_000;
}
