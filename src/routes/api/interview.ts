// POST /api/interview — the interview HTTP contract from technical-spec.md.
// No authentication. State is keyed by sessionId.
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AiUnavailableError, continueInterview, startInterview } from "@/lib/interview/engine.server";
import { loadSession, saveSession } from "@/lib/interview/session-store.server";

const bodySchema = z.object({
  sessionId: z.string().min(1).max(200),
  message: z.string().max(8000).optional(),
  candidate: z
    .object({
      member: z.object({
        id: z.string(),
        name: z.string(),
        jobRole: z.string(),
        yearsExperience: z.number(),
        education: z.string(),
        status: z.string(),
      }),
      missions: z.array(
        z.object({
          day: z.number(),
          title: z.string(),
          passed: z.boolean().optional(),
          skipped: z.boolean().optional(),
          attempts: z.number().optional(),
        }),
      ),
      signals: z.object({
        commitDays: z.number(),
        missionsCompleted: z.number(),
        missionsFirstTry: z.number(),
      }),
    })
    .optional(),
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/api/interview")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return json({ error: "Invalid request body" }, 400);
        }

        const { sessionId, message, candidate } = parsed;

        try {
          const existing = await loadSession(sessionId);

          if (!existing) {
            if (!candidate) {
              return json({ error: "A candidate is required to start an interview" }, 400);
            }
            const { state, reply } = await startInterview(sessionId, candidate);
            await saveSession(state);
            return json({ reply, done: false });
          }

          if (existing.completed) {
            return json({ reply: "Interview completed.", done: true });
          }

          if (!message || !message.trim()) {
            return json({ reply: existing.currentQuestion, done: false });
          }

          const result = await continueInterview(existing, message.trim());
          await saveSession(result.state);
          return json(
            result.done
              ? { reply: result.reply, done: true, feedback: result.feedback }
              : { reply: result.reply, done: false },
          );
        } catch (error) {
          console.error("/api/interview failed", error);
          if (error instanceof AiUnavailableError) {
            return json({ error: error.message }, 503);
          }
          return json({ error: "Interview service error" }, 500);
        }
      },
    },
  },
});