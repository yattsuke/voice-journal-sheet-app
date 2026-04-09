function readRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

export const env = {
  openAiApiKey: () => readRequiredEnv("OPENAI_API_KEY"),
  transcriptionModel: () => process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe",
  formattingModel: () => process.env.OPENAI_FORMATTING_MODEL || "gpt-4.1-mini",
  appsScriptUrl: () => process.env.GOOGLE_APPS_SCRIPT_URL || "",
  appsScriptSecret: () => process.env.GOOGLE_APPS_SCRIPT_SECRET || ""
};
