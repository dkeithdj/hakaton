import type { Settings } from "../shared/types";

export const DEFAULT_SETTINGS: Settings = {
  eventName: "Hackathon",
  tagline: "Build something real in three hours.",
  guidelines: [
    "Required output: a pitch and a working prototype demo.",
    "Length: 5 minutes total for pitch and demo combined.",
    "Judging: clarity of the problem, quality of the solution, and a prototype that makes the idea feel real.",
  ].join("\n"),
  milestones: [
    { title: "Define the problem and shape the idea", minutes: 45 },
    { title: "Build the prototype", minutes: 90 },
    { title: "Build the pitch deck", minutes: 30 },
    { title: "Practice the 5-minute pitch", minutes: 15 },
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

