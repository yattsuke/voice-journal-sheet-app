import { env } from "@/lib/env";

type FormatJournalInput = {
  transcript: string;
  recordedAt: string;
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
  recordedAt
}: FormatJournalInput): Promise<FormatJournalOutput> {
  const prompt = [
    "You are a diary editing assistant.",
    "Rewrite the spoken note into a natural Japanese diary entry.",
    "Do not invent facts and do not exaggerate.",
    "Return JSON only.",
    'Format: {"title":"short title in Japanese","body":"2-6 paragraph diary entry in Japanese"}',
    `Recorded at: ${recordedAt}`,
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
