import { NextResponse } from "next/server";
import { appendJournalToSheet } from "@/lib/google-sheets";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      recordedAt?: string;
      transcript?: string;
      polishedTitle?: string;
      polishedBody?: string;
    };

    if (!body.recordedAt || !body.transcript || !body.polishedTitle || !body.polishedBody) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const result = await appendJournalToSheet({
      recordedAt: body.recordedAt,
      transcript: body.transcript,
      polishedTitle: body.polishedTitle,
      polishedBody: body.polishedBody
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "A server error occurred while saving."
      },
      { status: 500 }
    );
  }
}
