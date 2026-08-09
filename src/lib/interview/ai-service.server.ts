// AI service: strict-JSON calls to the Lovable AI Gateway Responses API.
// Server-only. Streams the response so long reasoning turns never time out.
const ENDPOINT = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";

export class AiUnavailableError extends Error {}

type JsonSchema = Record<string, unknown>;

async function readStream(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) throw new AiUnavailableError("Empty AI response stream");
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (event.type === "response.completed" && !text) {
          text = event.response?.output_text ?? "";
        }
      } catch {
        // ignore keep-alive / non-JSON frames
      }
    }
  }
  return text;
}

/** Runs one strict-schema JSON completion. Throws when the model is unavailable. */
export async function generateJson<T>(args: {
  system: string;
  user: string;
  schemaName: string;
  schema: JsonSchema;
}): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new AiUnavailableError(
      "LOVABLE_API_KEY is not configured for this environment. The interview engine requires it.",
    );
  }

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      input: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      text: {
        format: {
          type: "json_schema",
          name: args.schemaName,
          strict: true,
          schema: args.schema,
        },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("AI gateway error", res.status, detail);
    if (res.status === 429) throw new AiUnavailableError("The AI interviewer is rate limited. Please retry shortly.");
    if (res.status === 402) throw new AiUnavailableError("AI credits are exhausted for this workspace.");
    throw new AiUnavailableError("The AI interviewer is temporarily unavailable.");
  }

  const text = await readStream(res);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new AiUnavailableError("The AI interviewer returned an empty response.");
  return JSON.parse(match[0]) as T;
}

export function strictObject(properties: Record<string, unknown>): JsonSchema {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}
