import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Candidate } from "@/lib/interview/types";

interface Props {
  candidate: Candidate;
  selected: boolean;
  onSelect: (candidate: Candidate) => void;
}

export function CandidateCard({ candidate, selected, onSelect }: Props) {
  const { member } = candidate;
  return (
    <button
      type="button"
      onClick={() => onSelect(candidate)}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-xl border bg-card/70 p-5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-card",
        selected ? "border-primary/70 btn-glow" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{member.name}</h3>
          <p className="mt-0.5 text-xs tracking-wide text-muted-foreground">{member.id}</p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">
          {member.status}
        </Badge>
      </div>
      <p className="mt-3 text-sm text-foreground/90">{member.jobRole}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {member.yearsExperience} yrs experience · {member.education}
      </p>
    </button>
  );
}