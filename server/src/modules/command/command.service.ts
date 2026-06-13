import { nanoid } from "nanoid";
import Anthropic from "@anthropic-ai/sdk";
import { and, eq } from "drizzle-orm";
import type { CommandResponse, ProposedAction } from "@momentum/shared";
import { db, schema } from "../../common/config/db";
import { corsairFor } from "../../common/config/corsair";
import { anthropic, fenceUntrusted } from "../../common/services/ai/llm";
import { env } from "../../common/config/env";
import * as emailSvc from "../inbox/inbox.service";
import * as calSvc from "../calendar/calendar.service";
import * as slackSvc from "../integrations/slack.service";
import * as ghSvc from "../integrations/github.service";
import { logActivity } from "../../common/services/activity.service";

/**
 * Natural-language command bar + agent chat, powered by Corsair MCP.
 *
 * Security model ("Momentum never sends without you"):
 *  - READ tools execute immediately (search mail, list events, read PRs).
 *  - WRITE tools (send email, create event, post Slack, create issue) do NOT
 *    execute — they create a row in proposed_actions. The UI shows an approval
 *    card; only POST /actions/:id/approve (a user session) runs the side effect.
 *  - The model literally has no tool that performs outbound effects directly,
 *    so prompt-injected emails cannot exfiltrate or send anything.
 */

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_email",
    description: "Semantic search over the user's cached email (fast, local).",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "list_events",
    description: "List the user's calendar events between two ISO datetimes (UTC).",
    input_schema: {
      type: "object",
      properties: { from: { type: "string" }, to: { type: "string" } },
      required: ["from", "to"],
    },
  },
  {
    name: "list_prs",
    description: "List GitHub PRs awaiting the user's review.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "propose_send_email",
    description: "Propose sending an email. Requires user approval in the UI before anything is sent.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "array", items: { type: "string" } },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "propose_create_event",
    description: "Propose a calendar event + invites. Requires user approval before creation.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        start: { type: "string", description: "ISO UTC" },
        end: { type: "string", description: "ISO UTC" },
        attendees: { type: "array", items: { type: "string" } },
      },
      required: ["title", "start", "end"],
    },
  },
  {
    name: "propose_slack_post",
    description: "Propose posting a Slack message. Requires user approval.",
    input_schema: {
      type: "object",
      properties: { channel: { type: "string" }, text: { type: "string" } },
      required: ["channel", "text"],
    },
  },
  {
    name: "propose_github_issue",
    description: "Propose creating a GitHub issue. Requires user approval.",
    input_schema: {
      type: "object",
      properties: {
        owner: { type: "string" },
        repo: { type: "string" },
        title: { type: "string" },
        body: { type: "string" },
      },
      required: ["owner", "repo", "title"],
    },
  },
];

const PROPOSAL_KIND: Record<string, ProposedAction["kind"]> = {
  propose_send_email: "send_email",
  propose_create_event: "create_event",
  propose_slack_post: "slack_post",
  propose_github_issue: "github_create_issue",
};

export async function runCommand(userId: string, userTz: string, input: string): Promise<CommandResponse> {
  if (!env.ANTHROPIC_API_KEY) {
    return { reply: "Connect an Anthropic API key in .env to use the command bar.", proposals: [] };
  }

  const nowIso = new Date().toISOString();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: fenceUntrusted("user_command", input) }];
  const proposals: ProposedAction[] = [];

  for (let turn = 0; turn < 6; turn++) {
    const res = await anthropic.messages.create({
      model: env.AI_AGENT_MODEL,
      max_tokens: 2048,
      system: `You are Momentum's command agent. Now (UTC): ${nowIso}. User timezone: ${userTz} — interpret natural language times ("9 AM next Thursday") in the user's timezone and convert to UTC ISO.
Read tools run immediately. Anything outbound (email, invite, Slack post, issue) must go through a propose_* tool; tell the user it awaits their approval. Never claim something was sent.`,
      tools: TOOLS,
      messages,
    });

    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUses.length || res.stop_reason !== "tool_use") {
      const reply = res.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { reply: reply || "Done.", proposals };
    }

    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];

    for (const tu of toolUses) {
      const args = tu.input as Record<string, unknown>;
      let output: unknown;
      try {
        if (tu.name === "search_email") {
          output = await emailSvc.localSearch(userId, String(args.query ?? ""), 8);
        } else if (tu.name === "list_events") {
          output = await calSvc.listEvents(userId, String(args.from), String(args.to));
        } else if (tu.name === "list_prs") {
          output = await ghSvc.prsAwaitingReview(userId);
        } else if (tu.name in PROPOSAL_KIND) {
          const id = nanoid();
          const kind = PROPOSAL_KIND[tu.name]!;
          const description = describeProposal(kind, args);
          await db.insert(schema.proposedActions).values({
            id,
            userId,
            kind,
            description,
            payload: args,
            status: "pending",
          });
          const p: ProposedAction = {
            id,
            kind,
            description,
            payload: args,
            status: "pending",
            createdAt: new Date().toISOString(),
          };
          proposals.push(p);
          await logActivity(userId, "agent", "action.proposed", description, id);
          output = { proposed: true, id, note: "Awaiting user approval in the UI." };
        } else {
          output = { error: "unknown tool" };
        }
      } catch (e) {
        output = { error: "tool failed" };
      }
      results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(output).slice(0, 6000) });
    }
    messages.push({ role: "user", content: results });
  }
  return { reply: "I hit my step limit — try a simpler command.", proposals };
}

function describeProposal(kind: ProposedAction["kind"], args: Record<string, unknown>): string {
  switch (kind) {
    case "send_email":
      return `Send email “${args.subject}” to ${(args.to as string[])?.join(", ")}`;
    case "create_event":
      return `Create event “${args.title}” at ${args.start} with ${((args.attendees as string[]) ?? []).join(", ") || "no invitees"}`;
    case "slack_post":
      return `Post to Slack #${args.channel}`;
    case "github_create_issue":
      return `Create GitHub issue “${args.title}” in ${args.owner}/${args.repo}`;
    default:
      return kind;
  }
}

/** The ONLY code path that turns a proposal into a real side effect. */
export async function resolveProposal(userId: string, id: string, approve: boolean) {
  const rows = await db
    .select()
    .from(schema.proposedActions)
    .where(and(eq(schema.proposedActions.id, id), eq(schema.proposedActions.userId, userId)))
    .limit(1);
  const p = rows[0];
  if (!p || p.status !== "pending") return null;

  if (!approve) {
    await db
      .update(schema.proposedActions)
      .set({ status: "rejected", resolvedAt: new Date() })
      .where(eq(schema.proposedActions.id, id));
    await logActivity(userId, "user", "action.rejected", p.description, id);
    return { status: "rejected" as const };
  }

  const payload = p.payload as Record<string, unknown>;
  try {
    if (p.kind === "send_email") {
      await emailSvc.sendEmail(userId, {
        to: payload.to as string[],
        subject: String(payload.subject),
        body: String(payload.body),
      });
    } else if (p.kind === "create_event") {
      await calSvc.createEvent(userId, {
        title: String(payload.title),
        start: String(payload.start),
        end: String(payload.end ?? new Date(new Date(String(payload.start)).getTime() + 1_800_000).toISOString()),
        attendees: (payload.attendees as string[]) ?? [],
      });
    } else if (p.kind === "slack_post") {
      await slackSvc.postMessage(userId, String(payload.channel), String(payload.text));
    } else if (p.kind === "github_create_issue") {
      await ghSvc.createIssue(
        userId,
        String(payload.owner),
        String(payload.repo),
        String(payload.title),
        String(payload.body ?? ""),
      );
    }
    await db
      .update(schema.proposedActions)
      .set({ status: "executed", resolvedAt: new Date() })
      .where(eq(schema.proposedActions.id, id));
    await logActivity(userId, "user", "action.approved", p.description, id);
    return { status: "executed" as const };
  } catch {
    await db
      .update(schema.proposedActions)
      .set({ status: "failed", resolvedAt: new Date() })
      .where(eq(schema.proposedActions.id, id));
    return { status: "failed" as const };
  }
}
