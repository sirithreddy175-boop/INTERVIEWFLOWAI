// Shared domain types for the AI Interview Agent.

export interface Mission {
  day: number;
  title: string;
  passed?: boolean | undefined;
  skipped?: boolean | undefined;
  attempts?: number | undefined;
}

export interface CandidateSignals {
  commitDays: number;
  missionsCompleted: number;
  missionsFirstTry: number;
}

export interface CandidateMember {
  id: string;
  name: string;
  jobRole: string;
  yearsExperience: number;
  education: string;
  status: string;
}

export interface Candidate {
  member: CandidateMember;
  missions: Mission[];
  signals: CandidateSignals;
}

export interface CurriculumModule {
  n: number;
  title: string;
  days: number[];
}

export interface CurriculumDay {
  day: number;
  title: string;
  type: string;
  tools: string[];
  objectives: string[];
}

export interface Curriculum {
  cohort: string;
  modules: CurriculumModule[];
  days: CurriculumDay[];
}

export type TopicReason = "failed" | "skipped" | "struggled" | "strength" | "core";

export interface InterviewTopic {
  day: number;
  title: string;
  module: string;
  type: string;
  tools: string[];
  objectives: string[];
  reason: TopicReason;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface ConversationTurn {
  role: "interviewer" | "candidate";
  content: string;
}

export interface TopicScore {
  topic: string;
  score: number;
  correctness?: number | undefined;
  depth?: number | undefined;
  reasoning?: number | undefined;
  relevance?: number | undefined;
  clarity?: number | undefined;
}

export type NextAction = "follow_up" | "deepen" | "fundamentals" | "next_topic";

export interface InterviewState {
  sessionId: string;
  candidate: Candidate;
  conversation: ConversationTurn[];
  currentQuestion: string;
  currentTopic: string;
  questionNumber: number;
  topicsCovered: string[];
  topicsRemaining: string[];
  difficulty: Difficulty;
  scores: TopicScore[];
  strengths: string[];
  gaps: string[];
  maxQuestions: number;
  followUps: number;
  askedQuestions: string[];
  completed: boolean;
}

export interface InterviewFeedback {
  summary: string;
  strengths: string[];
  gaps: string[];
  next: string[];
}

export interface InterviewResponse {
  reply: string;
  done: boolean;
  feedback?: InterviewFeedback | undefined;
}