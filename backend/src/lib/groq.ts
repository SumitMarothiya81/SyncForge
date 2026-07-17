const GROQ_API_KEY = process.env.GROQ_API_KEY;
const CHAT_MODEL = "llama-3.3-70b-versatile"; // fast, free, strong quality

if (!GROQ_API_KEY) {
  console.warn("GROQ_API_KEY is not set — AI chat routes will fail until it's configured.");
}

export async function streamChatCompletion(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  onToken: (token: string) => void
): Promise<void> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: CHAT_MODEL, messages, stream: true }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Groq chat request failed: ${res.status} ${await res.text()}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice("data:".length).trim();
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload);
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch {
        // Skip malformed SSE chunks rather than crashing the stream
      }
    }
  }
}



// Non-streaming variant — used where we need the full response at once
// (structured JSON, Mermaid syntax) rather than token-by-token display.
export async function getChatCompletion(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: CHAT_MODEL, messages, stream: false }),
  });

  if (!res.ok) {
    throw new Error(`Groq request failed: ${res.status} ${await res.text()}`);
  }

const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}