# AI Prompts & Development Log — InterviewFlowAI

This document records the AI-assisted development work used to build and debug **InterviewFlowAI**. It intentionally contains **no API keys, service-role keys, passwords, tokens, or other secrets**.

## 1. Project Goal

Build an AI-powered technical interview platform that:

- Presents candidates with technical interview questions.
- Adapts follow-up questions based on candidate responses.
- Covers multiple AI/software-engineering topics.
- Evaluates answers using structured scoring.
- Tracks interview progress, strengths, gaps, topics covered, and topics remaining.
- Stores interview sessions and results in Supabase.
- Provides a live web application suitable for a hackathon submission.

## 2. Initial Product Direction

The interview experience was designed around an AI interviewer that:

- Starts with a technical question.
- Reads the candidate's response.
- Generates a relevant follow-up when clarification or deeper evaluation is needed.
- Changes difficulty where appropriate.
- Scores answers on dimensions such as:
  - clarity
  - correctness
  - depth
  - reasoning
  - relevance
  - overall score
- Produces structured interview-session data.

## 3. Interview Topics

The project uses technical topics including:

- Embeddings Explained
- Vector Databases Overview
- Retrieval & Matching Engine
- Prompt Engineering Fundamentals
- Function Calling & Structured Outputs
- Chatbot Backend & API Integration
- Conversation Memory & Context Management
- Streaming Responses
- Multi-Agent Orchestration
- Model Context Protocol (MCP)
- Docker & Kubernetes Deployment
- Monitoring, Logging & Observability
- Capstone Project & Final Demo

## 4. Adaptive Interview Logic

The interviewer was designed to avoid simply asking unrelated questions.

The workflow is:

1. Select a topic based on the candidate/project context.
2. Ask a technical question.
3. Evaluate the candidate's answer.
4. Identify strengths and knowledge gaps.
5. If necessary, ask a focused follow-up question.
6. Move to another topic when the current topic has been sufficiently evaluated.
7. Stop after the configured maximum number of questions.
8. Save the complete conversation and evaluation.

Example interview progression used during testing:

- Initial observability question
- Follow-up about structured logs, Prometheus metrics, cardinality, and Grafana alerts
- Follow-up about structured logs vs Prometheus metrics
- Follow-up about Prometheus counters vs histograms
- Transition into prompt engineering
- Questions about prompt comparison, zero-shot/few-shot prompting, system prompts, and prompt templates

## 5. Structured Interview Results

Interview sessions store structured information similar to:

```json
{
  "sessionId": "example-session-id",
  "completed": true,
  "questionNumber": 6,
  "maxQuestions": 8,
  "currentTopic": "Prompt Engineering Fundamentals",
  "difficulty": "medium",
  "topicsCovered": [
    "Monitoring, Logging & Observability",
    "Prompt Engineering Fundamentals"
  ],
  "scores": [
    {
      "score": 8,
      "topic": "The Retrieval & Matching Engine"
    }
  ],
  "strengths": [],
  "gaps": [],
  "conversation": []
}
```

Real test data in the database also demonstrated candidate profiles, mission history, interview conversations, scores, strengths, gaps, and completion state.

## 6. Supabase Integration

The project uses Supabase for backend/database functionality.

The local `.env` file contains project configuration variables such as:

- `SUPABASE_PROJECT_ID`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

### Security note

Secrets were intentionally not included in this document.

The following must **never** be committed to GitHub:

- `SUPABASE_SERVICE_ROLE_KEY`
- private API keys
- access tokens
- passwords
- authentication secrets

The `.env` file should remain ignored by Git.

## 7. Supabase Server-Key Issue

During local development, the `/api/interview` endpoint reported a missing:

`SUPABASE_SERVICE_ROLE_KEY`

The project was originally connected to Lovable Cloud/Supabase, where the server-side Supabase configuration was managed by the platform.

The important debugging conclusion was:

- A publishable Supabase key is not equivalent to a service-role key.
- Server-side administrative operations may require a server-side secret.
- Secrets should be configured through the deployment/platform secret manager rather than exposed in client-side code.
- The existing database and tables were retained rather than unnecessarily creating a second database.

The Lovable Cloud environment was subsequently rebound/reconfigured so the server-side Supabase integration could initialize correctly.

## 8. Database Verification

The Supabase database was inspected through the Lovable Cloud database interface.

The available backend areas included:

- Database
- Users
- Storage
- Secrets
- Jobs
- Edge Functions
- SQL Editor
- Logs
- Usage

The database contained actual interview-session records from testing.

Examples included sessions containing:

- candidate information
- interview questions
- candidate answers
- scoring
- strengths
- knowledge gaps
- topics covered
- topics remaining
- completion status
- timestamps

## 9. SSR / Server Error Handling

The project contains a custom server entry that wraps the TanStack Start server handler.

The server wrapper:

1. Loads the TanStack Start server entry.
2. Calls the server's `fetch()` handler.
3. Detects certain swallowed H3 SSR errors.
4. Logs the captured underlying error.
5. Returns a readable HTML error page instead of an opaque JSON `HTTPError` response.
6. Catches unexpected server exceptions and returns the same error page.

This was used to improve debugging of server-side failures.

## 10. Vite Configuration

The project uses:

```ts
import { defineConfig } from "@Lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
```

The Lovable TanStack configuration already supplies its standard plugins and environment-variable injection, so duplicate plugins were intentionally avoided.

## 11. Local Development / Git Recovery

A downloaded project ZIP was opened in VS Code after local development changes had caused problems.

A fresh Git repository was initialized:

```bash
git init
git add .
git commit -m "Initial working version"
```

The branch was renamed to `main`:

```bash
git branch -M main
```

A GitHub remote was then configured and the project was pushed:

```bash
git remote add origin https://github.com/sirithreddy175-boop/INTERVIEWFLOWAI.git
git push -u origin main
```

The GitHub repository is:

https://github.com/sirithreddy175-boop/INTERVIEWFLOWAI

## 12. Deployment

The project was deployed through Lovable.

The live application was verified at:

https://interview-ace-bot-10.lovable.app

The live `/api/interview` endpoint was tested and confirmed to return a real interview turn.

## 13. Hackathon Submission

The submission form required:

- A live project URL
- A GitHub repository URL
- An AI-usage log URL

The AI-usage log is represented by this `AI_PROMPTS.md` file in the GitHub repository so reviewers can inspect how AI assistance was used during development.

## 14. AI-Assisted Development Approach

AI assistance was used for:

- Debugging Supabase server configuration
- Diagnosing missing environment variables
- Reasoning about Lovable Cloud/Supabase integration
- Designing adaptive interview logic
- Designing interview scoring and follow-up behavior
- Structuring interview-session data
- Debugging SSR/server errors
- Reviewing Vite/TanStack configuration
- Preparing the project for GitHub
- Preparing the hackathon submission

The AI was used as a development and debugging assistant; the final project was assembled, tested, and deployed by the project developer.

## 15. Example Prompt Categories Used

### Product design

> Design an AI technical interviewer that asks a question, evaluates the candidate's response, identifies gaps, and asks an appropriate follow-up question.

### Interview evaluation

> Evaluate the candidate response for clarity, correctness, depth, reasoning, and relevance. Identify strengths and knowledge gaps and determine whether a follow-up question is needed.

### Adaptive questioning

> Generate a focused follow-up question that addresses the specific weakness in the candidate's previous answer without unnecessarily repeating the original question.

### Backend debugging

> Diagnose why the interview API cannot initialize the server-side Supabase client and determine which environment configuration is missing.

### Error handling

> Add server-side error handling that captures unexpected SSR failures and provides a useful error page while preserving the original error for debugging.

### Deployment verification

> Verify that the interview API returns a real interview turn in the deployed application and confirm that the production backend is connected to the intended database.

## 16. Security & Reproducibility

For reproducibility, reviewers can inspect:

- the GitHub source code
- this AI usage log
- the deployed live application

Secrets are deliberately excluded.

A fresh developer should configure their own environment variables rather than copying private credentials from another environment.

---

**Project:** InterviewFlowAI  
**Repository:** https://github.com/sirithreddy175-boop/INTERVIEWFLOWAI  
**Live application:** https://interview-ace-bot-10.lovable.app
