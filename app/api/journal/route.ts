import { NextResponse } from "next/server";
import { formatJournalEntry, transcribeAudio } from "@/lib/openai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const recordedAt = String(formData.get("recordedAt") || new Date().toISOString());

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Audio file was not found." }, { status: 400 });
    }

    const transcript = await transcribeAudio(audio);

    if (!transcript.trim()) {
      return NextResponse.json({ error: "The transcription result was empty." }, { status: 400 });
    }

    const formatted = await formatJournalEntry({
      transcript,
      recordedAt
    });

    return NextResponse.json({
      transcript,
      polishedTitle: formatted.title,
      polishedBody: formatted.body,
      recordedAt
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "A server error occurred."
      },
      { status: 500 }
    );
  }
}
