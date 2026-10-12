export interface Milestone {
  title: string;
  minutes: number;
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

export interface TeamResult {
  teamId: number;
  average: number;
  count: number;
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
