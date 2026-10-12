import type { Settings } from "../shared/types";

export const DEFAULT_SETTINGS: Settings = {
  eventName: "Hackathon",
  tagline: "Build something real in three hours.",
  guidelines: [
    "**Required output:** a pitch and a working prototype demo.",
    "**Length:** *5 minutes total* for pitch and demo combined.",
    "**Judging:**",
    "- Clarity of the problem",
    "- Quality of the solution",
    "- A prototype that makes the idea feel real",
  ].join("\n"),
  milestones: [
    {
      title: "Define the problem and shape the idea",
      minutes: 45,
      hint: "Pick your SGDs, then agree on **who** has the problem and **one thing** your solution does for them. Write it as a single sentence.",
    },
    {
      title: "Build the prototype",
      minutes: 90,
      hint: "Build **one flow** that works end to end with sample data. Skip logins and settings. Start with a **Google tool** from the toolbox.",
    },
    {
      title: "Build the pitch deck",
      minutes: 30,
      hint: "Copy the **pitch deck template** from the organizer resources into your AI tool. Keep it to *six slides*, one idea each.",
    },
    {
      title: "Practice the 5-minute pitch",
      minutes: 15,
      hint: "Run it against the **pitch timer** at least twice: about *3 minutes* talking and *2 minutes* of live demo. Upload a backup deck and video.",
    },
  ],
  hackDurationMin: 180,
  voteDurationSec: 120,
  hackEndsAt: null,
  hackPausedRemainingMs: null,
  voteEndsAt: null,
  resultsPublished: false,
};

export async function getSettings(db: D1Database): Promise<Settings> {
  const { results } = await db
    .prepare("SELECT key, value FROM settings")
    .all<{ key: string; value: string }>();
  return mergeSettings(results);
}

export function mergeSettings(rows: { key: string; value: string }[]): Settings {
  const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    if (row.key in DEFAULT_SETTINGS) settings[row.key] = JSON.parse(row.value);
  }
  return settings as unknown as Settings;
}

export function settingsStatements(db: D1Database, patch: Partial<Settings>): D1PreparedStatement[] {
  return Object.entries(patch).map(([key, value]) =>
    db
      .prepare(
        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      )
      .bind(key, JSON.stringify(value)),
  );
}

export async function saveSettings(db: D1Database, patch: Partial<Settings>): Promise<void> {
  const statements = settingsStatements(db, patch);
  if (statements.length > 0) await db.batch(statements);
}

