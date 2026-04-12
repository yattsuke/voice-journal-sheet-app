export type JournalThemeId = "work" | "life" | "other";

export type JournalTheme = {
  id: JournalThemeId;
  label: string;
  description: string;
  sheetName: string;
  promptHint: string;
};

export const journalThemes: JournalTheme[] = [
  {
    id: "work",
    label: "仕事",
    description: "会議、進捗、気づきなど仕事の記録",
    sheetName: "仕事",
    promptHint: "Use a clear and practical tone that fits work notes."
  },
  {
    id: "life",
    label: "生活",
    description: "家族、買い物、体調、日常の出来事",
    sheetName: "生活",
    promptHint: "Use a warm and natural tone that fits everyday life notes."
  },
  {
    id: "other",
    label: "その他",
    description: "趣味、学び、外出先のメモなど",
    sheetName: "その他",
    promptHint: "Use a flexible tone that matches personal notes and miscellaneous topics."
  }
];

export function getJournalTheme(themeId?: string | null): JournalTheme {
  return journalThemes.find((theme) => theme.id === themeId) || journalThemes[2];
}
