import { corsairFor } from "../../common/config/corsair";
import { env } from "../../common/config/env";
import { fenceUntrusted, jsonCompletion } from "../../common/services/ai/llm";
import { z } from "zod";
import { logActivity } from "../../common/services/activity.service";

export async function listMemberChannels(userId: string) {
  const tenant = corsairFor(userId);
  // db.* reads the local Corsair cache — instant, no Slack API call.
  // Entity rows are { entity_id, data } where data is the Slack channel object.
  let channels = await tenant.slack.db.channels.search({ limit: 100 });
  if (!channels.length) {
    // Cold cache: one live list call hydrates it (Corsair upserts entities).
    await tenant.slack.api.channels.list({ exclude_archived: true, limit: 100 }).catch(() => null);
    channels = await tenant.slack.db.channels.search({ limit: 100 });
  }
  return channels
    .filter((c) => c.data?.is_member && !c.data?.is_archived)
    .map((c) => ({
      channelId: c.entity_id,
      name: c.data?.name ?? "unknown",
      members: Number(c.data?.num_members ?? 0),
    }));
}

const CatchUp = z.object({
  summary: z.string().max(2000),
  actionItems: z.array(z.string().max(200)),
});

/** Slack catch-up: summarize unread channels & threads (no tools, JSON out). */
export async function summarizeChannel(userId: string, channelId: string) {
  const tenant = corsairFor(userId);
  const history = (await tenant.slack.api.channels.getHistory({ channel: channelId, limit: 50 })) as {
    messages?: Array<{ user?: string; text?: string; ts?: string }>;
  };
  const text = (history.messages ?? []).map((m) => `${m.user ?? "?"}: ${m.text ?? ""}`).join("\n");
  if (!env.ANTHROPIC_API_KEY) return { summary: "Connect an AI key for summaries.", actionItems: [] };
  return jsonCompletion({
    system: `Summarize this Slack channel for someone catching up. 3-5 sentences + action items.
Schema: {"summary":"...","actionItems":["..."]}`,
    user: fenceUntrusted("slack_channel", text),
    parse: (raw) => CatchUp.parse(raw),
  });
}

export async function postMessage(userId: string, channel: string, text: string) {
  const tenant = corsairFor(userId);
  const res = await tenant.slack.api.messages.post({ channel, text });
  await logActivity(userId, "automation", "slack.posted", `Posted to channel`, channel);
  return res;
}

/** Detect standup messages and surface them for the agenda. */
export function isStandup(text: string): boolean {
  return /\b(standup|stand-up|daily sync)\b/i.test(text) || /yesterday[\s\S]*today[\s\S]*block/i.test(text);
}
