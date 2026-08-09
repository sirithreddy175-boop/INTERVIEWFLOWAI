// Frontend API service for the POST /api/interview contract.
import type { Candidate, InterviewResponse } from "@/lib/interview/types";

const ENDPOINT = "/api/interview";

async function post(body: Record<string, unknown>): Promise<InterviewResponse> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? "The interview service is unavailable.");
  }
  return (await res.json()) as InterviewResponse;
}

/** First request: sends sessionId + candidate. */
export function startInterview(sessionId: string, candidate: Candidate) {
  return post({ sessionId, candidate });
}

/** Subsequent requests: sends sessionId + message. */
export function sendMessage(sessionId: string, message: string) {
  return post({ sessionId, message });
}

export function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sess-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}