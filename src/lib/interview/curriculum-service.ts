// Curriculum + candidate awareness layer.
// Pure functions over the supplied curriculum.json / candidates.json data,
// so the interview engine can reason about what to ask without touching the UI.
import { curriculum } from "@/data/curriculum";
import { candidates } from "@/data/candidates";
import type {
  Candidate,
  CurriculumDay,
  InterviewTopic,
  Mission,
  TopicReason,
} from "./types";

export const cohortName = curriculum.cohort;
export const modules = curriculum.modules;
export const days = curriculum.days;

export function getCandidates(): Candidate[] {
  return candidates;
}

export function getCandidateById(id: string): Candidate | undefined {
  return candidates.find((c) => c.member.id === id);
}

export function getDay(day: number): CurriculumDay | undefined {
  return curriculum.days.find((d) => d.day === day);
}

export function getModuleForDay(day: number): string {
  const found = curriculum.modules.find((m) => {
    const start = m.days[0] ?? 0;
    const end = m.days[1] ?? start;
    return day >= start && day <= end;
  });
  return found ? `Module ${found.n}: ${found.title}` : "Curriculum";
}

function classify(mission: Mission): TopicReason | null {
  if (mission.skipped) return "skipped";
  if (mission.passed === false) return "failed";
  if ((mission.attempts ?? 1) >= 3) return "struggled";
  if (mission.passed) return "strength";
  return null;
}

const PRIORITY: Record<TopicReason, number> = {
  failed: 0,
  skipped: 1,
  struggled: 2,
  strength: 3,
  core: 4,
};

function toTopic(day: number, title: string, reason: TopicReason): InterviewTopic {
  const info = getDay(day);
  return {
    day,
    title: info?.title ?? title,
    module: getModuleForDay(day),
    type: info?.type ?? "BUILD",
    tools: info?.tools ?? [],
    objectives: info?.objectives ?? [],
    reason,
  };
}

/**
 * Builds the adaptive topic plan for a candidate: weak areas first, then
 * strengths for depth probing, padded with core curriculum days if needed.
 */
export function buildTopicPlan(
  candidate: Candidate,
  size = 6,
): InterviewTopic[] {
  const role = candidate.member.jobRole.toLowerCase();

  const roleKeywords: Record<string, string[]> = {
    backend: [
      "api",
      "server",
      "database",
      "data",
      "architecture",
      "system",
      "deployment",
      "security",
    ],
    "software engineer": [
      "programming",
      "software",
      "api",
      "database",
      "architecture",
      "system",
      "testing",
    ],
    "ai engineer": [
      "ai",
      "machine learning",
      "ml",
      "llm",
      "rag",
      "agent",
      "embedding",
      "vector",
      "evaluation",
    ],
    "machine learning": [
      "machine learning",
      "ml",
      "embedding",
      "vector",
      "evaluation",
      "ai",
    ],
    devops: [
      "deployment",
      "docker",
      "container",
      "infrastructure",
      "monitoring",
      "security",
    ],
    data: [
      "data",
      "database",
      "sql",
      "analytics",
      "machine learning",
    ],
  };

  const keywords =
    Object.entries(roleKeywords).find(([name]) =>
      role.includes(name),
    )?.[1] ?? [];

  const relevance = (topic: InterviewTopic) => {
    const text = [
      topic.title,
      topic.module,
      topic.type,
      ...topic.tools,
      ...topic.objectives,
    ]
      .join(" ")
      .toLowerCase();

    return keywords.filter((keyword) => text.includes(keyword)).length;
  };

  const missionTopics = candidate.missions
    .map((mission) => {
      const reason = classify(mission);
      return reason ? toTopic(mission.day, mission.title, reason) : null;
    })
    .filter((t): t is InterviewTopic => t !== null)
    .sort(
      (a, b) =>
        PRIORITY[a.reason] - PRIORITY[b.reason] ||
        relevance(b) - relevance(a) ||
        a.day - b.day,
    );

  const plan: InterviewTopic[] = [];
  const seen = new Set<number>();

  for (const topic of missionTopics) {
    if (seen.has(topic.day)) continue;

    seen.add(topic.day);
    plan.push(topic);

    if (plan.length === size) return plan;
  }

  const coreTopics = curriculum.days
    .filter((day) => !seen.has(day.day) && day.type !== "SETUP")
    .map((day) => toTopic(day.day, day.title, "core"))
    .sort((a, b) => relevance(b) - relevance(a));

  for (const topic of coreTopics) {
    plan.push(topic);

    if (plan.length === size) break;
  }

  return plan;
}
/** Compact, model-friendly description of a candidate's learning history. */
export function summarizeCandidate(candidate: Candidate): string {
  const { member, missions, signals } = candidate;
  const line = (m: Mission) =>
    `Day ${m.day} "${m.title}": ${
      m.skipped ? "SKIPPED" : m.passed ? `passed in ${m.attempts ?? 1} attempt(s)` : `FAILED after ${m.attempts ?? 1} attempt(s)`
    }`;
  return [
    `${member.name} (${member.id}) — ${member.jobRole}, ${member.yearsExperience} yrs experience, ${member.education}. Cohort status: ${member.status}.`,
    `Signals: ${signals.commitDays} commit days, ${signals.missionsCompleted} missions completed, ${signals.missionsFirstTry} passed first try.`,
    `Mission history:`,
    ...missions.map(line),
  ].join("\n");
}

export function describeTopic(topic: InterviewTopic): string {
  return [
    `${topic.module} — Day ${topic.day}: ${topic.title} (${topic.type})`,
    `Tools: ${topic.tools.join(", ") || "n/a"}`,
    `Objectives: ${topic.objectives.join("; ")}`,
    `Why selected: ${topic.reason}`,
  ].join("\n");
}