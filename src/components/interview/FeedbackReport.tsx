import { CheckCircle2, AlertTriangle, ArrowUpRight } from "lucide-react";
import type { InterviewFeedback } from "@/lib/interview/types";

function Section({
  title,
  items,
  icon: Icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: typeof CheckCircle2;
  tone: string;
}) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone}`} aria-hidden />
        <h3 className="text-sm font-semibold uppercase tracking-wider">{title}</h3>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-foreground/90">
            <span className={`mt-2 h-1 w-1 shrink-0 rounded-full bg-current ${tone}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeedbackReport({ feedback }: { feedback: InterviewFeedback }) {
  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Overall summary
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{feedback.summary}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Section title="Strengths" items={feedback.strengths} icon={CheckCircle2} tone="text-success" />
        <Section title="Gaps" items={feedback.gaps} icon={AlertTriangle} tone="text-warning" />
        <Section title="Next steps" items={feedback.next} icon={ArrowUpRight} tone="text-primary" />
      </div>
    </div>
  );
}