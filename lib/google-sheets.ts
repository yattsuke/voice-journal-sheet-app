import { env } from "@/lib/env";

type AppendJournalInput = {
  recordedAt: string;
  transcript: string;
  polishedTitle: string;
  polishedBody: string;
};

type AppendJournalResult = {
  saved: boolean;
  rowNumber?: number;
};

export async function appendJournalToSheet({
  recordedAt,
  transcript,
  polishedTitle,
  polishedBody
}: AppendJournalInput): Promise<AppendJournalResult> {
  const url = env.appsScriptUrl();
  const secret = env.appsScriptSecret();

  if (!url) {
    return { saved: false };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      secret,
      recordedAt,
      transcript,
      polishedTitle,
      polishedBody
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Saving to Google Sheets failed: ${message}`);
  }

  const data = (await response.json()) as { ok?: boolean; rowNumber?: number };
  return {
    saved: Boolean(data.ok),
    rowNumber: data.rowNumber
  };
}
