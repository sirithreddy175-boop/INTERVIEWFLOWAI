// Adaptive interview engine: curriculum-aware, candidate-aware, evidence-driven.
// Server-only. Hidden scoring signals are never exposed to the candidate.
import {
  buildTopicPlan,
  cohortName,
  describeTopic,
  summarizeCandidate,
} from "./curriculum-service";
import { AiUnavailableError, generateJson, strictObject } from "./ai-service.server";
import type {
  Candidate,
  Difficulty,
  InterviewFeedback,
  InterviewState,
  InterviewTopic,
  NextAction,
} from "./types";
import { MAX_QUESTIONS, MIN_QUESTIONS, TOTAL_QUESTIONS } from "./constants";

export { TOTAL_QUESTIONS, AiUnavailableError };

const MAX_FOLLOW_UPS = 3;

function seniority(candidate: Candidate): string {
  const yrs = candidate.member.yearsExperience;
  if (yrs >= 6) return "senior";
  if (yrs >= 3) return "mid-level";
  if (yrs >= 1) return "junior";
  return "intern / early-career";
}

function startingDifficulty(candidate: Candidate): Difficulty {
  const yrs = candidate.member.yearsExperience;
  const firstTryRate =
    candidate.signals.missionsCompleted > 0
      ? candidate.signals.missionsFirstTry / candidate.signals.missionsCompleted
      : 0;
  if (yrs >= 6 && firstTryRate >= 0.5) return "hard";
  if (yrs >= 3 || firstTryRate >= 0.6) return "medium";
  return "easy";
}

function systemPrompt(state: Pick<InterviewState, "candidate" | "difficulty" | "askedQuestions">): string {
  return [
    `You are a senior technical interviewer running a structured, adaptive interview for the "${cohortName}" program.`,
    `Interview level: ${seniority(state.candidate)}. Current target difficulty: ${state.difficulty}.`,
    ``,
    `Candidate dossier (INTERNAL — never quote scores, attempts, missions or signals back to the candidate):`,
    summarizeCandidate(state.candidate),
    ``,
    `Rules:`,
    `- Ask exactly ONE question per turn, under 60 words, plain prose (no markdown, no lists).`,
    `- Ground every question in the supplied curriculum topic; do not invent unrelated trivia.`,
    `- Calibrate depth to a ${seniority(state.candidate)} candidate.`,
    `- Never repeat or rephrase a question already asked:`,
    state.askedQuestions.map((q, i) => `  ${i + 1}. ${q}`).join("\n") || "  (none yet)",
    `- Never reveal internal scoring, mission history or evaluation criteria.`,
  ].join("\n");
}

function transcript(state: InterviewState): string {
  return state.conversation
    .map((t) => `${t.role === "interviewer" ? "Interviewer" : "Candidate"}: ${t.content}`)
    .join("\n");
}

function adjustDifficulty(current: Difficulty, score: number): Difficulty {
  if (score >= 7) return current === "easy" ? "medium" : "hard";
  if (score <= 3) return current === "hard" ? "medium" : "easy";
  return current;
}

function planFor(candidate: Candidate): InterviewTopic[] {
  return buildTopicPlan(candidate, MAX_QUESTIONS);
}

function topicByTitle(plan: InterviewTopic[], title: string): InterviewTopic | undefined {
  return plan.find((t) => t.title === title);
}

function pickNextTopic(state: InterviewState, plan: InterviewTopic[]): InterviewTopic | undefined {
  const remaining = state.topicsRemaining
    .map((title) => topicByTitle(plan, title))
    .filter((t): t is InterviewTopic => Boolean(t));
  return remaining[0];
}

/** Creates a fresh interview and produces the opening question. */
export async function startInterview(
  sessionId: string,
  candidate: Candidate,
): Promise<{ state: InterviewState; reply: string }> {
  const plan = planFor(candidate);
  const first = plan[0];
  const difficulty = startingDifficulty(candidate);

  const { question } = await generateJson<{ question: string }>({
    system: systemPrompt({ candidate, difficulty, askedQuestions: [] }),
    user: [
      `Open the interview with the first question, on this curriculum topic:`,
      first ? describeTopic(first) : "General AI engineering fundamentals",
      ``,
      `The question must fit a ${seniority(candidate)} candidate at ${difficulty} difficulty.`,
    ].join("\n"),
    schemaName: "opening_question",
    schema: strictObject({ question: { type: "string" } }),
  });

  const reply = `Welcome ${candidate.member.name.split(" ")[0]}. I'll be your interviewer today for a short technical conversation based on your ${cohortName} work. Take your time.\n\n${question}`;

  const state: InterviewState = {
    sessionId,
    candidate,
    conversation: [{ role: "interviewer", content: reply }],
    currentQuestion: question,
    currentTopic: first?.title ?? "",
    questionNumber: 1,
    topicsCovered: [],
    topicsRemaining: plan.slice(1).map((t) => t.title),
    difficulty,
    scores: [],
    strengths: [],
    gaps: [],
    maxQuestions: MAX_QUESTIONS,
    followUps: 0,
    askedQuestions: [question],
    completed: false,
  };

  return { state, reply };
}

interface Evaluation {
  correctness: number;
  depth: number;
  reasoning: number;
  relevance: number;
  clarity: number;
  score: number;
  action: NextAction;
  strength: string;
  gap: string;
  enoughEvidence: boolean;
}

const evaluationSchema = strictObject({
  correctness: { type: "number" },
  depth: { type: "number" },
  reasoning: { type: "number" },
  relevance: { type: "number" },
  clarity: { type: "number" },
  score: { type: "number" },
  action: { type: "string", enum: ["follow_up", "deepen", "fundamentals", "next_topic"] },
  strength: { type: "string" },
  gap: { type: "string" },
  enoughEvidence: { type: "boolean" },
});

/** Processes a candidate answer and returns the next question or the final feedback. */
export async function continueInterview(
  state: InterviewState,
  message: string,
): Promise<{ state: InterviewState; reply: string; done: boolean; feedback?: InterviewFeedback }> {
  const plan = planFor(state.candidate);
  const answeredTopic = state.currentTopic
    ? topicByTitle(plan, state.currentTopic)
    : undefined;
  state.conversation.push({ role: "candidate", content: message });

  // 1. Evaluate the answer across the required dimensions.
  const evaluation = await generateJson<Evaluation>({
    system: systemPrompt(state),
    user: [
      `Interview so far:`,
      transcript(state),
      ``,
      `Topic just assessed:`,
      answeredTopic ? describeTopic(answeredTopic) : state.currentTopic || "General",
      ``,
      `Evaluate ONLY the candidate's most recent answer.`,
      `Rate correctness, depth, reasoning, relevance and clarity from 0-10, then give an overall score 0-10.`,
      `Choose the next action:`,
      `- "follow_up": the answer was incomplete or vague — probe the same point.`,
      `- "deepen": the answer was strong — go deeper on the same topic at higher difficulty.`,
      `- "fundamentals": the answer was weak — test the prerequisite concept behind it.`,
      `- "next_topic": the topic is sufficiently assessed — move on.`,
      `"strength" = one short concrete strength shown in this answer (empty string if none).`,
      `"gap" = one short concrete gap shown in this answer (empty string if none).`,
      `"enoughEvidence" = true only if the whole conversation already gives clear evidence across the candidate's key areas.`,
    ].join("\n"),
    schemaName: "answer_evaluation",
    schema: evaluationSchema,
  });

  const clamp = (n: unknown) => Math.max(0, Math.min(10, Number(n) || 0));
  const score = clamp(evaluation.score);
  state.scores.push({
    topic: answeredTopic?.title || state.currentTopic || `Question ${state.questionNumber}`,
    score,
    correctness: clamp(evaluation.correctness),
    depth: clamp(evaluation.depth),
    reasoning: clamp(evaluation.reasoning),
    relevance: clamp(evaluation.relevance),
    clarity: clamp(evaluation.clarity),
  });
  if (evaluation.strength?.trim()) state.strengths.push(evaluation.strength.trim());
  if (evaluation.gap?.trim()) state.gaps.push(evaluation.gap.trim());
  state.difficulty = adjustDifficulty(state.difficulty, score);

  // 2. Decide whether to stay on the topic or move to the next one.
  let action: NextAction = evaluation.action;
  if (state.followUps >= MAX_FOLLOW_UPS && action !== "next_topic") action = "next_topic";
  const staying = action === "follow_up" || action === "deepen" || action === "fundamentals";

  if (!staying && answeredTopic) {
    state.topicsCovered.push(answeredTopic.title);
    state.topicsRemaining = state.topicsRemaining.filter((t) => t !== answeredTopic.title);
  }

  // 3. Decide whether the interview has enough evidence to end.
  const asked = state.questionNumber;
  const noTopicsLeft = state.topicsRemaining.length === 0 && !staying;
  const shouldFinish =
    asked >= state.maxQuestions ||
    (asked >= MIN_QUESTIONS && (noTopicsLeft || evaluation.enoughEvidence === true));

  if (shouldFinish) {
    const feedback = await generateFeedback(state);
    state.completed = true;
    state.currentQuestion = "";
    state.conversation.push({ role: "interviewer", content: "Interview completed." });
    return { state, reply: "Interview completed.", done: true, feedback };
  }

  // 4. Generate the adapted next question.
  const upcoming = staying ? answeredTopic : (pickNextTopic(state, plan) ?? answeredTopic);
  const intent: Record<NextAction, string> = {
    follow_up: `The answer was incomplete. Ask a targeted follow-up on the same point — do not change topic.`,
    deepen: `The answer was strong. Ask a harder, deeper question on the same topic.`,
    fundamentals: `The answer was weak. Ask a simpler question testing the prerequisite concept behind this topic.`,
    next_topic: `Move on to the next curriculum topic below.`,
  };

  const { question } = await generateJson<{ question: string }>({
    system: systemPrompt(state),
    user: [
      `Interview so far:`,
      transcript(state),
      ``,
      intent[action],
      ``,
      `Topic to use:`,
      upcoming ? describeTopic(upcoming) : "A deeper follow-up on the same topic",
      ``,
      `Briefly acknowledge the previous answer in one short clause, then ask the single next question.`,
      `Difficulty: ${state.difficulty}. This is question ${asked + 1} of at most ${state.maxQuestions}.`,
    ].join("\n"),
    schemaName: "next_question",
    schema: strictObject({ question: { type: "string" } }),
  });

  state.questionNumber += 1;
  if (staying) state.followUps += 1;
  else state.followUps = 0;
  state.currentQuestion = question;
  state.currentTopic = upcoming?.title ?? state.currentTopic;
  state.askedQuestions.push(question);
  state.conversation.push({ role: "interviewer", content: question });
  return { state, reply: question, done: false };
}

async function generateFeedback(state: InterviewState): Promise<InterviewFeedback> {
  const averageScore =
    state.scores.reduce((sum, s) => sum + s.score, 0) / Math.max(1, state.scores.length);

  return generateJson<InterviewFeedback>({
    system: `You write concise, evidence-based technical interview reports for hiring teams. Every point must reference something the candidate actually said or failed to say in the transcript. No generic filler.`,
    user: [
      `Candidate dossier (internal):`,
      summarizeCandidate(state.candidate),
      ``,
      `Interview transcript:`,
      transcript(state),
      ``,
      `Internal per-topic scores (0-10): ${state.scores.map((s) => `${s.topic}=${s.score}`).join(", ")} (average ${averageScore.toFixed(1)}).`,
      `Observed strengths during the interview: ${state.strengths.join("; ") || "none recorded"}.`,
      `Observed gaps during the interview: ${state.gaps.join("; ") || "none recorded"}.`,
      `Topics assessed: ${[...state.topicsCovered, state.currentTopic].filter(Boolean).join(", ")}.`,
      ``,
      `Write: a 3-4 sentence summary, then 3-4 strengths, 3-4 gaps and 3-4 recommended next steps.`,
      `Each list item is one concise, specific, actionable sentence tied to the conversation and curriculum topics.`,
    ].join("\n"),
    schemaName: "interview_feedback",
    schema: strictObject({
      summary: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      gaps: { type: "array", items: { type: "string" } },
      next: { type: "array", items: { type: "string" } },
    }),
  });
}
