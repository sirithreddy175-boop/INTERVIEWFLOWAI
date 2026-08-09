import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CandidateCard } from "@/components/interview/CandidateCard";
import { CandidateProfile } from "@/components/interview/CandidateProfile";
import { getCandidates } from "@/lib/interview/curriculum-service";
import type { Candidate } from "@/lib/interview/types";

export const Route = createFileRoute("/candidates")({
  head: () => ({
    meta: [
      { title: "Select a Candidate — InterviewAI" },
      {
        name: "description",
        content:
          "Choose a cohort candidate and review their profile before starting an adaptive AI technical interview.",
      },
      { property: "og:title", content: "Select a Candidate — InterviewAI" },
      {
        property: "og:description",
        content: "Browse cohort candidates and launch a curriculum-aware AI interview session.",
      },
    ],
  }),
  component: CandidateSelection,
});

function CandidateSelection() {
  const navigate = useNavigate();
  const candidates = getCandidates();
  const [selected, setSelected] = useState<Candidate | null>(null);

  return (
    <main className="hero-surface min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Link>

        <h1 className="mt-6 text-3xl font-bold md:text-4xl">Select a candidate</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {candidates.length} candidates from the cohort. The interviewer will use their mission
          history and curriculum progress to shape the session.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4 sm:grid-cols-2">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.member.id}
                candidate={candidate}
                selected={selected?.member.id === candidate.member.id}
                onSelect={setSelected}
              />
            ))}
          </div>

          <aside className="lg:sticky lg:top-10 lg:self-start">
            {selected ? (
              <div className="space-y-4">
                <CandidateProfile candidate={selected} />
                <Button
                  size="lg"
                  className="w-full btn-glow"
                  onClick={() =>
                    navigate({ to: "/interview", search: { candidate: selected.member.id } })
                  }
                >
                  Start Interview
                  <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Select a candidate to see their profile.
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}