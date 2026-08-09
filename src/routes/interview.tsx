import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CandidateProfile } from "@/components/interview/CandidateProfile";
import { FeedbackReport } from "@/components/interview/FeedbackReport";
import { getCandidateById } from "@/lib/interview/curriculum-service";
import { TOTAL_QUESTIONS } from "@/lib/interview/constants";
import { createSessionId, sendMessage, startInterview } from "@/services/interview-api";
import type { ConversationTurn, InterviewFeedback } from "@/lib/interview/types";

export const Route = createFileRoute("/interview")({
  validateSearch: (search: Record<string, unknown>) => ({
    candidate: typeof search["candidate"] === "string" ? search["candidate"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Live Interview — InterviewAI" },
      {
        name: "description",
        content: "Conduct an adaptive, curriculum-aware AI technical interview session.",
      },
      { property: "og:title", content: "Live Interview — InterviewAI" },
      {
        property: "og:description",
        content: "A structured AI-led technical interview with live progress and a final report.",
      },
    ],
  }),
  component: InterviewScreen,
});

function InterviewScreen() {
  const { candidate: candidateId } = Route.useSearch();
  const candidate = getCandidateById(candidateId);

  const sessionId = useMemo(() => createSessionId(), []);
  const started = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!candidate || started.current) return;
    started.current = true;
    startInterview(sessionId, candidate)
      .then((res) => {
        setConversation([{ role: "interviewer", content: res.reply }]);
        setQuestionNumber(1);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [candidate, sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [conversation, loading]);

  useEffect(() => {
    if (!loading && !done) inputRef.current?.focus();
  }, [loading, done]);

  if (!candidate) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">No candidate selected</h1>
          <Link to="/candidates" className="mt-4 inline-block">
            <Button>Choose a candidate</Button>
          </Link>
        </div>
      </main>
    );
  }

  const submit = async () => {
    const text = answer.trim();
    if (!text || loading || done) return;
    setAnswer("");
    setError(null);
    setConversation((prev) => [...prev, { role: "candidate", content: text }]);
    setLoading(true);
    try {
      const res = await sendMessage(sessionId, text);
      setConversation((prev) => [...prev, { role: "interviewer", content: res.reply }]);
      if (res.done) {
        setDone(true);
        setFeedback(res.feedback ?? null);
      } else {
        setQuestionNumber((n) => Math.min(TOTAL_QUESTIONS, n + 1));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const progress = done ? 100 : (Math.max(0, questionNumber - 1) / TOTAL_QUESTIONS) * 100;

  return (
    <main className="hero-surface min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/candidates"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Candidates
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${done ? "bg-success" : loading ? "bg-warning" : "bg-primary"}`}
              aria-hidden
            />
            {done ? "Session complete" : loading ? "Interviewer is thinking" : "Session active"}
            <span className="ml-2 rounded-md border border-border px-2 py-0.5 font-mono text-[11px]">
              {sessionId.slice(0, 8)}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
            <CandidateProfile candidate={candidate} />
            <div className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="uppercase tracking-wider">Progress</span>
                <span>
                  Question {done ? TOTAL_QUESTIONS : questionNumber} of {TOTAL_QUESTIONS}
                </span>
              </div>
              <Progress value={progress} className="mt-3 h-1.5" />
            </div>
          </aside>

          <section className="flex min-h-[70vh] flex-col rounded-2xl border border-border bg-card/50">
            <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-6">
              {conversation.map((turn, i) => (
                <div
                  key={i}
                  className={turn.role === "candidate" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      turn.role === "candidate"
                        ? "max-w-[85%] rounded-2xl rounded-br-sm bg-secondary px-4 py-3 text-sm leading-relaxed"
                        : "max-w-[85%] rounded-2xl rounded-bl-sm border border-primary/25 bg-background/60 px-4 py-3 text-sm leading-relaxed"
                    }
                  >
                    {turn.role === "interviewer" && (
                      <p className="mb-1 text-[11px] uppercase tracking-[0.18em] text-primary">
                        Interviewer
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{turn.content}</p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {conversation.length === 0
                    ? "Preparing your interview…"
                    : "Interviewer is reviewing your answer…"}
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              {done && feedback && (
                <div className="pt-2">
                  <FeedbackReport feedback={feedback} />
                </div>
              )}
            </div>

            {!done && (
              <div className="border-t border-border p-4">
                <textarea
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
                  }}
                  rows={3}
                  disabled={loading}
                  placeholder="Type your answer…"
                  aria-label="Your answer"
                  className="w-full resize-none rounded-xl border border-input bg-background/60 px-4 py-3 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">⌘/Ctrl + Enter to submit</span>
                  <Button onClick={() => void submit()} disabled={loading || !answer.trim()}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden />
                    )}
                    Submit answer
                  </Button>
                </div>
              </div>
            )}

            {done && (
              <div className="border-t border-border p-4 text-center">
                <Link to="/candidates">
                  <Button variant="secondary">Interview another candidate</Button>
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}