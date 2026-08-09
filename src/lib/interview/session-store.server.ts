// Minimal session state persistence. Same sessionId == same interview.
import type { InterviewState } from "./types";
import type { Json } from "@/integrations/supabase/types";

export async function loadSession(sessionId: string): Promise<InterviewState | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("interview_sessions")
    .select("state")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) {
    console.error("loadSession failed", error);
    throw new Error("Unable to load interview session");
  }
  if (!data) return null;
  return data.state as unknown as InterviewState;
}

export async function saveSession(state: InterviewState): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("interview_sessions").upsert(
    {
      session_id: state.sessionId,
      state: state as unknown as Json,
      completed: state.completed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" },
  );
  if (error) {
    console.error("saveSession failed", error);
    throw new Error("Unable to save interview session");
  }
}