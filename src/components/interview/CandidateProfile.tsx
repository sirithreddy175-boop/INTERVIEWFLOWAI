import { Badge } from "@/components/ui/badge";
import type { Candidate } from "@/lib/interview/types";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

export function CandidateProfile({ candidate }: { candidate: Candidate }) {
  const { member, signals, missions } = candidate;
  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{member.name}</h2>
          <p className="text-xs tracking-wide text-muted-foreground">
            {member.id} · {member.jobRole}
          </p>
        </div>
        <Badge variant="outline" className="border-primary/40 text-primary">
          {member.status}
        </Badge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Experience" value={`${member.yearsExperience} years`} />
        <Stat label="Education" value={member.education} />
        <Stat label="Commit days" value={signals.commitDays} />
        <Stat label="Missions done" value={signals.missionsCompleted} />
        <Stat label="First-try passes" value={signals.missionsFirstTry} />
        <Stat label="Missions on file" value={missions.length} />
      </div>
    </div>
  );
}