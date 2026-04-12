import { env } from "@/lib/env";
import type { JournalTheme } from "@/lib/journal-themes";

type AppendJournalInput = {
  recordedAt: string;
  transcript: string;
  polishedTitle: string;
  polishedBody: string;
  theme: JournalTheme;
};

type AppendJournalResult = {
  saved: boolean;
  rowNumber?: number;
  sheetName: string;
};

export async function appendJournalToSheet({
  recordedAt,
  transcript,
  polishedTitle,
  polishedBody,
  theme
}: AppendJournalInput): Promise<AppendJournalResult> {
  const url = env.appsScriptUrl();
  const secret = env.appsScriptSecret();

  if (!url) {
    throw new Error("GOOGLE_APPS_SCRIPT_URL is not configured.");
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
      polishedBody,
      themeId: theme.id,
      themeLabel: theme.label,
      sheetName: theme.sheetName
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Saving to Google Sheets failed: ${message}`);
  }

  const data = (await response.json()) as { ok?: boolean; rowNumber?: number; error?: string };

  if (!data.ok) {
    throw new Error(data.error || "Google Sheets did not accept the journal entry.");
  }

  return {
    saved: true,
    rowNumber: data.rowNumber,
    sheetName: theme.sheetName
  };
}
