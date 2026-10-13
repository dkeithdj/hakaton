export interface Milestone {
  title: string;
  minutes: number;
  /** What to do in this step, shown under the title. Missing on milestones saved before hints existed. */
  hint?: string;
}

/** Settings safe to send to anyone. */
export interface PublicSettings {
  eventName: string;
  tagline: string;
  guidelines: string;
  milestones: Milestone[];
  hackDurationMin: number;
  voteDurationSec: number;
  /** Epoch ms when the hackathon timer ends; null when not running. */
  hackEndsAt: number | null;
  /** Remaining ms while paused; null when not paused. */
  hackPausedRemainingMs: number | null;
  /** Epoch ms when voting closes; null when voting was never opened. */
  voteEndsAt: number | null;
  resultsPublished: boolean;
  /** Whether teams can sign in and use their workspace. The admin opens this when the event starts. */
  participantAccess: boolean;
}

export type Settings = PublicSettings;

export interface Topic {
  id: number;
  title: string;
  description: string;
  /** Hex color of the goal's tile. */
  color: string;
  /** Doubles as the goal number shown on its tile. */
  sort: number;
}

export interface Team {
  id: number;
  name: string;
  /** What the team is building, set by the team. Empty until they name it. */
  projectTitle: string;
  members: string[];
  /** The goals the team is building on. Empty until they pick at least one. */
  topicIds: number[];
  /** Indexes into settings.milestones that the team has ticked off. */
  progress: number[];
  sort: number;
}

/** Teams as the admin sees them. The password never appears in public state. */
export interface AdminTeam extends Team {
  password: string;
}

export interface Me {
  role: Role | null;
  /** The team a participant signed in as; null for admins and signed-out visitors. */
  teamId: number | null;
}

export interface ScheduleItem {
  id: number;
  timeLabel: string;
  title: string;
  description: string;
  sort: number;
}

export interface Prompt {
  id: number;
  title: string;
  tool: string;
  body: string;
  sort: number;
}

export interface Tool {
  id: number;
  name: string;
  description: string;
  url: string;
  /** Who makes it. Tools from Google are listed first for participants. */
  vendor: string;
  /** Hex color that identifies the tool wherever it is mentioned. */
  color: string;
  sort: number;
}

/** Something the organizers hand out: a link, a copyable template, or both. */
export interface Material {
  id: number;
  title: string;
  description: string;
  url: string;
  body: string;
  sort: number;
}

/** Judges count for most of the final score; the audience vote makes up the rest. */
export const JUDGE_WEIGHT = 0.8;
export const AUDIENCE_WEIGHT = 0.2;
/** What each judge scores a team on, and the most points each criterion is worth. */
export const JUDGE_CRITERIA = [
  { key: "pitch", label: "Pitch", max: 25 },
  { key: "demo", label: "Demo", max: 40 },
  { key: "impact", label: "Impact", max: 35 },
] as const;
export type JudgeCriterion = (typeof JUDGE_CRITERIA)[number]["key"];
export type CriteriaScores = Record<JudgeCriterion, number>;
export const JUDGE_MAX_SCORE = JUDGE_CRITERIA.reduce((total, criterion) => total + criterion.max, 0);
export const AUDIENCE_MAX_RATING = 5;

export interface TeamResult {
  teamId: number;
  /** Weighted total out of 100. A side with no scores yet counts as zero. */
  final: number;
  /** Mean of the judges' totals out of JUDGE_MAX_SCORE; null until a judge scores the team. */
  judgeAverage: number | null;
  judgeCount: number;
  /** Mean audience rating out of AUDIENCE_MAX_RATING; null until someone rates the team. */
  audienceAverage: number | null;
  audienceCount: number;
}

export function finalScore(judgeAverage: number | null, audienceAverage: number | null): number {
  const judges = ((judgeAverage ?? 0) / JUDGE_MAX_SCORE) * 100;
  const audience = ((audienceAverage ?? 0) / AUDIENCE_MAX_RATING) * 100;
  return JUDGE_WEIGHT * judges + AUDIENCE_WEIGHT * audience;
}

export interface Judge {
  id: number;
  /** Set by the admin; the judge types it to sign in. Blank once participant data is deleted. */
  name: string;
  sort: number;
}

export interface JudgeScore extends CriteriaScores {
  judgeId: number;
  teamId: number;
}

export function judgeTotal(scores: CriteriaScores): number {
  return JUDGE_CRITERIA.reduce((total, criterion) => total + scores[criterion.key], 0);
}

/** What /judge loads: who is signed in on this browser and what they have scored so far. */
export interface JudgeSession {
  judge: Judge | null;
  /** Keyed by team id. */
  scores: Record<number, CriteriaScores>;
}

export interface EventState {
  serverNow: number;
  settings: PublicSettings;
  teams: Team[];
  topics: Topic[];
  schedule: ScheduleItem[];
  ballotCount: number;
  /** Only present once the admin publishes results. */
  results: TeamResult[] | null;
}

export type UploadKind = "deck" | "video";

export interface Upload {
  id: number;
  teamId: number;
  kind: UploadKind;
  filename: string;
  size: number;
  createdAt: number;
}

export type Role = "admin" | "participant";

export type Phase =
  | "upcoming"
  | "hacking"
  | "paused"
  | "pitching"
  | "voting"
  | "voting_closed"
  | "results";

export function getPhase(s: PublicSettings, now: number): Phase {
  if (s.resultsPublished) return "results";
  if (s.voteEndsAt !== null) return now < s.voteEndsAt ? "voting" : "voting_closed";
  if (s.hackPausedRemainingMs !== null) return "paused";
  if (s.hackEndsAt !== null) return now < s.hackEndsAt ? "hacking" : "pitching";
  return "upcoming";
}

export const UPLOAD_PART_SIZE = 10 * 1024 * 1024;
export const UPLOAD_LIMITS: Record<UploadKind, { maxBytes: number; extensions: string[] }> = {
  deck: { maxBytes: 100 * 1024 * 1024, extensions: ["pdf", "ppt", "pptx", "key", "odp"] },
  video: { maxBytes: 500 * 1024 * 1024, extensions: ["mp4", "mov", "webm", "mkv", "m4v"] },
};
