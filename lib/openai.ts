import { env } from "@/lib/env";
import type { JournalTheme } from "@/lib/journal-themes";

type FormatJournalInput = {
  transcript: string;
  recordedAt: string;
  theme: JournalTheme;
};

type FormatJournalOutput = {
  title: string;
  body: string;
};

type ResponsesApiOutputItem = {
  type?: string;
  text?: string;
};

type ResponsesApiResponse = {
  output_text?: string;
  output?: Array<{
    content?: ResponsesApiOutputItem[];
  }>;
};

export async function transcribeAudio(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", env.transcriptionModel());

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiApiKey()}`
    },
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Transcription failed: ${message}`);
  }

  const data = (await response.json()) as { text?: string };
  return data.text || "";
}

export async function formatJournalEntry({
  transcript,
  recordedAt,
  theme
}: FormatJournalInput): Promise<FormatJournalOutput> {
  const prompt = [
    "You are a diary cleanup assistant.",
    "Your job is to lightly polish the spoken note into readable Japanese without changing its meaning.",
    "Stay strictly within what the speaker actually said.",
    "Do not add facts, emotions, causes, motives, context, summaries, interpretations, or examples.",
    "Do not paraphrase aggressively or replace concrete wording with broader wording.",
    "Preserve uncertainty, ambiguity, hedging, and incomplete thoughts if they appear in the transcript.",
    "Keep the original order of events and keep as much original wording as possible.",
    "Only do minimal cleanup such as removing filler words, fixing obvious transcription noise, and adjusting punctuation or line breaks.",
    "If a phrase is unclear, keep it close to the transcript instead of guessing.",
    "The body must remain semantically close to the transcript.",
    "Return JSON only.",
    'Format: {"title":"short factual title in Japanese","body":"1-3 short paragraphs in Japanese"}',
    "The title must be plain and factual, based only on the transcript. If unclear, use a generic title.",
    `Recorded at: ${recordedAt}`,
    `Theme: ${theme.label}`,
    `Theme guidance: ${theme.promptHint}`,
    "Original transcript:",
    transcript
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiApiKey()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.formattingModel(),
      input: prompt
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Journal polishing failed: ${message}`);
  }

  const data = (await response.json()) as ResponsesApiResponse;
  const text = extractTextFromResponse(data);

  try {
    const parsed = JSON.parse(text) as Partial<FormatJournalOutput>;
    return {
      title: parsed.title?.trim() || "Untitled Entry",
      body: parsed.body?.trim() || transcript
    };
  } catch {
    return {
      title: "Untitled Entry",
      body: text.trim() || transcript
    };
  }
}

function extractTextFromResponse(data: ResponsesApiResponse) {
  if (data.output_text) {
    return data.output_text;
  }

  const collected = data.output
    ?.flatMap((item) => item.content || [])
    .filter((content) => content.type === "output_text" || typeof content.text === "string")
    .map((content) => content.text || "")
    .join("")
    .trim();

  return collected || "";
}
