import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BrainCircuit, GaugeCircle, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cohortName } from "@/lib/interview/curriculum-service";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InterviewAI — Adaptive Curriculum-Aware AI Interviews" },
      {
        name: "description",
        content:
          "InterviewAI conducts adaptive technical interviews grounded in your cohort curriculum and each candidate's mission history.",
      },
      { property: "og:title", content: "InterviewAI — Adaptive Curriculum-Aware AI Interviews" },
      {
        property: "og:description",
        content:
          "Run structured AI-led technical interviews and get a summary, strengths, gaps and next steps for every candidate.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: BrainCircuit,
    title: "Curriculum-aware",
    body: "Every question is grounded in the cohort's modules, days, tools and learning objectives.",
  },
  {
    icon: GaugeCircle,
    title: "Adaptive difficulty",
    body: "The interviewer scores each answer privately and adjusts depth as the conversation progresses.",
  },
  {
    icon: ListChecks,
    title: "Structured report",
    body: "Close every session with a summary, strengths, gaps and concrete next steps.",
  },
];

function Landing() {
  return (
    <main className="hero-surface min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg font-bold tracking-tight">
          Interview<span className="text-gradient">AI</span>
        </span>
        <Link to="/candidates">
          <Button variant="ghost" size="sm">
            Candidates
          </Button>
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
          {cohortName}
        </div>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] md:text-6xl">
          Adaptive technical interviews that actually know{" "}
          <span className="text-gradient">what the candidate learned</span>
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          InterviewAI conducts conversational, curriculum-aware technical interviews. It reads each
          candidate's mission history, targets the topics that matter, adapts difficulty in real
          time, and returns a structured hiring report.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link to="/candidates">
            <Button size="lg" className="btn-glow">
              Start Interview
              <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <span className="text-xs text-muted-foreground">
            No setup · Runs on the /api/interview contract
          </span>
        </div>

        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="glass-panel rounded-2xl p-6">
              <f.icon className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="mt-4 text-base font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
