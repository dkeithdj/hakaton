import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import {
  JUDGE_CRITERIA,
  UPLOAD_LIMITS,
  UPLOAD_PART_SIZE,
  finalScore,
  type AdminTeam,
  type CriteriaScores,
  type EventState,
  type Judge,
  type JudgeScore,
  type JudgeSession,
  type Material,
  type Me,
  type Prompt,
  type Role,
  type ScheduleItem,
  type Settings,
  type Team,
  type TeamResult,
  type Tool,
  type Topic,
  type Upload,
  type UploadKind,
} from "../shared/types";
import {
  createResource,
  deleteResource,
  isResourceName,
  listResource,
  listStatement,
  mapRows,
  updateResource,
} from "./resources";
import { getSettings, mergeSettings, saveSettings, settingsStatements } from "./settings";

type AppEnv = { Bindings: Env; Variables: { role: Role; teamId: number | null } };
type AppContext = Context<AppEnv>;

const SESSION_COOKIE = "session";
const VOTER_COOKIE = "voter";
const JUDGE_COOKIE = "judge";
const SESSION_MAX_AGE = 60 * 60 * 12;
const VOTER_MAX_AGE = 60 * 60 * 24;

const app = new Hono<AppEnv>();

app.use("/api/*", csrf());

app.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error(error);
  return c.json({ error: "Internal error" }, 500);
});

function bad(message: string, status: 400 | 403 | 404 | 409 = 400): never {
  throw new HTTPException(status, { message });
}

async function readJson(c: AppContext): Promise<Record<string, unknown>> {
  const body = await c.req.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) bad("Expected a JSON object");
  return body as Record<string, unknown>;
}

function idParam(c: AppContext, name = "id"): number {
  const id = Number(c.req.param(name));
  if (!Number.isInteger(id) || id <= 0) bad("Invalid id");
  return id;
}

function cookieOptions(c: AppContext, maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "Lax" as const,
    secure: new URL(c.req.url).protocol === "https:",
    path: "/",
    maxAge,
  };
}

async function safeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(hashA, hashB);
}

/**
 * Ties a team session to the team's current password, so changing the
 * password in the admin page signs that team out.
 */
async function passwordTag(secret: string, password: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${secret}:${password}`));
  return [...new Uint8Array(digest).slice(0, 8)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generateTeamPassword(): string {
  // No look-alike characters: these get read off a screen and typed on phones.
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  return [...crypto.getRandomValues(new Uint8Array(6))].map((byte) => alphabet[byte % alphabet.length]).join("");
}

/** Session cookie is `admin` or `team:<id>:<passwordTag>`. */
async function getSession(c: AppContext): Promise<Me> {
  const signedOut: Me = { role: null, teamId: null };
  const value = await getSignedCookie(c, c.env.SESSION_SECRET, SESSION_COOKIE);
  if (!value) return signedOut;
  if (value === "admin") return { role: "admin", teamId: null };

  const [kind, id, tag] = value.split(":");
  const teamId = Number(id);
  if (kind !== "team" || !Number.isInteger(teamId) || !tag) return signedOut;
  const team = await c.env.DB.prepare("SELECT password FROM teams WHERE id = ?").bind(teamId).first<{ password: string }>();
  if (!team || tag !== (await passwordTag(c.env.SESSION_SECRET, team.password))) return signedOut;
  return { role: "participant", teamId };
}

const PARTICIPANTS_CLOSED = "Participant access is not open yet";

/** Admins can use participant routes too, including while participant access is closed. */
function requireRole(required: Role) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const session = await getSession(c);
    if (session.role !== "admin" && session.role !== required) {
      throw new HTTPException(401, { message: "Not signed in" });
    }
    if (session.role === "participant" && !(await getSettings(c.env.DB)).participantAccess) {
      bad(PARTICIPANTS_CLOSED, 403);
    }
    c.set("role", session.role);
    c.set("teamId", session.teamId);
    await next();
  });
}

/** A team may only touch its own data; admins may touch any team's. */
function assertTeamAccess(c: AppContext, teamId: unknown): asserts teamId is number {
  if (typeof teamId !== "number" || !Number.isInteger(teamId)) bad("Invalid teamId");
  if (c.get("role") !== "admin" && c.get("teamId") !== teamId) bad("That is not your team", 403);
}

function toPublicTeam(team: AdminTeam): Team {
  const { password: _, ...rest } = team;
  return rest;
}

/** One row per team, including teams nobody has scored yet. */
async function computeResults(db: D1Database): Promise<TeamResult[]> {
  const { results } = await db
    .prepare(
      "SELECT t.id AS teamId, j.average AS judgeAverage, COALESCE(j.count, 0) AS judgeCount, " +
        "a.average AS audienceAverage, COALESCE(a.count, 0) AS audienceCount FROM teams t " +
        "LEFT JOIN (SELECT team_id, AVG(pitch + demo + impact) AS average, COUNT(*) AS count FROM judge_scores GROUP BY team_id) j " +
        "ON j.team_id = t.id " +
        "LEFT JOIN (SELECT team_id, AVG(rating) AS average, COUNT(*) AS count FROM ratings GROUP BY team_id) a " +
        "ON a.team_id = t.id ORDER BY t.sort, t.id",
    )
    .all<Omit<TeamResult, "final">>();
  return results.map((row) => ({ ...row, final: finalScore(row.judgeAverage, row.audienceAverage) }));
}

// ---------------------------------------------------------------- public

app.get("/api/state", async (c) => {
  const db = c.env.DB;
  const [settingsRows, teams, topics, schedule, ballots] = await db.batch<Record<string, unknown>>([
    db.prepare("SELECT key, value FROM settings"),
    listStatement(db, "teams"),
    listStatement(db, "topics"),
    listStatement(db, "schedule"),
    db.prepare("SELECT COUNT(*) AS count FROM ballots"),
  ]);
  const settings = mergeSettings(settingsRows.results as { key: string; value: string }[]);
  const state: EventState = {
    serverNow: Date.now(),
    settings,
    teams: mapRows<AdminTeam>("teams", teams.results).map(toPublicTeam),
    topics: mapRows<Topic>("topics", topics.results),
    schedule: mapRows<ScheduleItem>("schedule", schedule.results),
    ballotCount: ballots.results[0].count as number,
    // The judge and audience parts behind each final score stay with the admin.
    results: settings.resultsPublished
      ? (await computeResults(db)).map(({ teamId, final }) => ({ teamId, final }))
      : null,
  };
  return c.json(state);
});

/** Public, so teams can sign up for the tools before participant access opens. */
app.get("/api/tools", async (c) => c.json(await listResource<Tool>(c.env.DB, "tools")));

app.get("/api/me", async (c) => c.json(await getSession(c)));

app.post("/api/login", async (c) => {
  const { role, password, teamId } = await readJson(c);
  if ((role !== "admin" && role !== "participant") || typeof password !== "string") bad("Invalid login");
  const wrong = new HTTPException(401, { message: "Wrong password" });
  const options = cookieOptions(c, SESSION_MAX_AGE);

  if (role === "admin") {
    if (!c.env.ADMIN_PASSWORD || !(await safeEqual(password, c.env.ADMIN_PASSWORD))) throw wrong;
    await setSignedCookie(c, SESSION_COOKIE, "admin", c.env.SESSION_SECRET, options);
    return c.json({ role, teamId: null } satisfies Me);
  }

  if (!(await getSettings(c.env.DB)).participantAccess) bad(PARTICIPANTS_CLOSED, 403);
  if (typeof teamId !== "number" || !Number.isInteger(teamId)) bad("Choose your team");
  const team = await c.env.DB.prepare("SELECT password FROM teams WHERE id = ?").bind(teamId).first<{ password: string }>();
  if (!team || team.password === "" || !(await safeEqual(password, team.password))) throw wrong;
  const tag = await passwordTag(c.env.SESSION_SECRET, team.password);
  await setSignedCookie(c, SESSION_COOKIE, `team:${teamId}:${tag}`, c.env.SESSION_SECRET, options);
  return c.json({ role, teamId } satisfies Me);
});

app.post("/api/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

// ---------------------------------------------------------------- voting

async function getVoterId(c: AppContext): Promise<string> {
  const existing = await getSignedCookie(c, c.env.SESSION_SECRET, VOTER_COOKIE);
  if (existing) return existing;
  const voterId = crypto.randomUUID();
  await setSignedCookie(c, VOTER_COOKIE, voterId, c.env.SESSION_SECRET, cookieOptions(c, VOTER_MAX_AGE));
  return voterId;
}

app.get("/api/vote/status", async (c) => {
  const voterId = await getVoterId(c);
  const ballot = await c.env.DB.prepare("SELECT 1 FROM ballots WHERE voter_id = ?").bind(voterId).first();
  return c.json({ hasVoted: ballot !== null });
});

app.post("/api/vote", async (c) => {
  const db = c.env.DB;
  const voterId = await getVoterId(c);
  const body = await readJson(c);
  const now = Date.now();

  const settings = await getSettings(db);
  if (settings.voteEndsAt === null || now >= settings.voteEndsAt) bad("Voting is closed", 403);

  const ratings = body.ratings;
  if (typeof ratings !== "object" || ratings === null) bad("Missing ratings");
  const { results: teams } = await db.prepare("SELECT id FROM teams").all<{ id: number }>();
  const entries = Object.entries(ratings as Record<string, unknown>);
  if (entries.length !== teams.length) bad("Rate every team");
  const inserts = teams.map(({ id }) => {
    const rating = (ratings as Record<string, unknown>)[String(id)];
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      bad("Each rating must be between 1 and 5");
    }
    return db.prepare("INSERT INTO ratings (voter_id, team_id, rating) VALUES (?, ?, ?)").bind(voterId, id, rating);
  });

  try {
    // The batch is one transaction: a duplicate ballot rolls back the ratings too.
    await db.batch([
      db.prepare("INSERT INTO ballots (voter_id, created_at) VALUES (?, ?)").bind(voterId, now),
      ...inserts,
    ]);
  } catch (error) {
    if (String(error).includes("UNIQUE")) bad("You have already voted", 409);
    throw error;
  }
  return c.json({ ok: true });
});

// ---------------------------------------------------------------- judging

/** The judge signed in on this browser, or null. A judge whose name was purged or who was removed is signed out. */
async function getJudge(c: AppContext): Promise<Judge | null> {
  const id = Number(await getSignedCookie(c, c.env.SESSION_SECRET, JUDGE_COOKIE));
  if (!Number.isInteger(id) || id <= 0) return null;
  return c.env.DB.prepare("SELECT id, name, sort FROM judges WHERE id = ? AND name <> ''").bind(id).first<Judge>();
}

async function judgeSession(db: D1Database, judge: Judge | null): Promise<JudgeSession> {
  if (!judge) return { judge: null, scores: {} };
  const { results } = await db
    .prepare("SELECT team_id AS teamId, pitch, demo, impact FROM judge_scores WHERE judge_id = ?")
    .bind(judge.id)
    .all<CriteriaScores & { teamId: number }>();
  return { judge, scores: Object.fromEntries(results.map(({ teamId, ...scores }) => [teamId, scores])) };
}

app.get("/api/judge", async (c) => c.json(await judgeSession(c.env.DB, await getJudge(c))));

// There is no password: a judge types the name the admin added for them, on any device.
app.post("/api/judge/login", async (c) => {
  const db = c.env.DB;
  const { username } = await readJson(c);
  if (typeof username !== "string" || username.trim() === "") bad("Enter your username");
  const judge = await db.prepare("SELECT id, name, sort FROM judges WHERE name = ?").bind(username.trim()).first<Judge>();
  if (!judge) throw new HTTPException(401, { message: "No judge with that username. Ask the organizers to add you." });
  await setSignedCookie(c, JUDGE_COOKIE, String(judge.id), c.env.SESSION_SECRET, cookieOptions(c, SESSION_MAX_AGE));
  return c.json(await judgeSession(db, judge));
});

app.post("/api/judge/logout", (c) => {
  deleteCookie(c, JUDGE_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

// Judging has no window of its own: scores can be entered or changed any time before results are published.
app.put("/api/judge/scores", async (c) => {
  const db = c.env.DB;
  const judge = await getJudge(c);
  if (!judge) throw new HTTPException(401, { message: "Not signed in" });
  if ((await getSettings(db)).resultsPublished) bad("Results are published, so scores are locked", 403);

  const { scores } = await readJson(c);
  if (typeof scores !== "object" || scores === null || Array.isArray(scores)) bad("Missing scores");
  const { results: teams } = await db.prepare("SELECT id FROM teams").all<{ id: number }>();
  const known = new Set(teams.map((team) => team.id));
  const statements = Object.entries(scores as Record<string, unknown>).map(([key, entry]) => {
    const teamId = Number(key);
    if (!known.has(teamId)) bad("Unknown team");
    // null clears a team scored by mistake.
    if (entry === null) {
      return db.prepare("DELETE FROM judge_scores WHERE judge_id = ? AND team_id = ?").bind(judge.id, teamId);
    }
    if (typeof entry !== "object" || Array.isArray(entry)) bad("Invalid scores");
    // A team is scored on every criterion at once, so a total is never missing a part.
    const points = JUDGE_CRITERIA.map(({ key: criterion, label, max }) => {
      const value = (entry as Record<string, unknown>)[criterion];
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max) {
        bad(`${label} must be between 0 and ${max}`);
      }
      return value;
    });
    return db
      .prepare(
        "INSERT INTO judge_scores (judge_id, team_id, pitch, demo, impact) VALUES (?, ?, ?, ?, ?) " +
          "ON CONFLICT(judge_id, team_id) DO UPDATE SET pitch = excluded.pitch, demo = excluded.demo, impact = excluded.impact",
      )
      .bind(judge.id, teamId, ...points);
  });
  if (statements.length > 0) await db.batch(statements);
  return c.json(await judgeSession(db, judge));
});

// ---------------------------------------------------------------- participant

const participant = new Hono<AppEnv>();
participant.use(requireRole("participant"));

participant.get("/content", async (c) => {
  const [materials, prompts, tools] = await Promise.all([
    listResource<Material>(c.env.DB, "materials"),
    listResource<Prompt>(c.env.DB, "prompts"),
    listResource<Tool>(c.env.DB, "tools"),
  ]);
  return c.json({ materials, prompts, tools });
});

participant.put("/teams/:id", async (c) => {
  const teamId = idParam(c);
  assertTeamAccess(c, teamId);
  const body = await readJson(c);
  if (Array.isArray(body.topicIds) && body.topicIds.length > 0) {
    const { results } = await c.env.DB.prepare("SELECT id FROM topics").all<{ id: number }>();
    const known = new Set<unknown>(results.map((row) => row.id));
    if (!body.topicIds.every((id) => known.has(id))) bad("Unknown topic");
  }
  const team = await updateResource(c.env.DB, "teams", teamId, body, ["projectTitle", "topicIds", "progress"]);
  return c.json(toPublicTeam(team as unknown as AdminTeam));
});

interface UploadRow {
  id: number;
  team_id: number;
  kind: UploadKind;
  filename: string;
  size: number;
  content_type: string;
  r2_key: string;
  r2_upload_id: string;
  status: "pending" | "done";
  created_at: number;
}

function toUpload(row: UploadRow): Upload {
  return {
    id: row.id,
    teamId: row.team_id,
    kind: row.kind,
    filename: row.filename,
    size: row.size,
    createdAt: row.created_at,
  };
}

async function getUploadRow(c: AppContext, status?: UploadRow["status"]): Promise<UploadRow> {
  const row = await c.env.DB.prepare("SELECT * FROM uploads WHERE id = ?").bind(idParam(c)).first<UploadRow>();
  if (!row || (status && row.status !== status)) bad("Upload not found", 404);
  assertTeamAccess(c, row.team_id);
  return row;
}

participant.get("/uploads", async (c) => {
  const teamId = Number(c.req.query("teamId"));
  assertTeamAccess(c, teamId);
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM uploads WHERE team_id = ? AND status = 'done' ORDER BY created_at DESC",
  )
    .bind(teamId)
    .all<UploadRow>();
  return c.json(results.map(toUpload));
});

participant.post("/uploads", async (c) => {
  const { teamId, kind, filename, size, contentType } = await readJson(c);
  assertTeamAccess(c, teamId);
  if (kind !== "deck" && kind !== "video") bad("Invalid kind");
  if (typeof filename !== "string" || filename.length === 0 || filename.length > 200) bad("Invalid filename");
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) bad("Invalid size");
  const limits = UPLOAD_LIMITS[kind];
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  if (!limits.extensions.includes(extension)) {
    bad(`Allowed file types: ${limits.extensions.join(", ")}`);
  }
  if (size > limits.maxBytes) bad(`File is larger than ${Math.floor(limits.maxBytes / 1024 / 1024)} MB`);
  const team = await c.env.DB.prepare("SELECT 1 FROM teams WHERE id = ?").bind(teamId).first();
  if (!team) bad("Unknown team");

  const type = typeof contentType === "string" && contentType ? contentType.slice(0, 100) : "application/octet-stream";
  const key = `teams/${teamId}/${kind}/${crypto.randomUUID()}.${extension}`;
  const multipart = await c.env.UPLOADS.createMultipartUpload(key, { httpMetadata: { contentType: type } });
  const row = await c.env.DB.prepare(
    "INSERT INTO uploads (team_id, kind, filename, size, content_type, r2_key, r2_upload_id, created_at) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
  )
    .bind(teamId, kind, filename, size, type, key, multipart.uploadId, Date.now())
    .first<{ id: number }>();
  return c.json({ id: row!.id, partSize: UPLOAD_PART_SIZE });
});

participant.put("/uploads/:id/parts/:part", async (c) => {
  const row = await getUploadRow(c, "pending");
  const partNumber = Number(c.req.param("part"));
  const partCount = Math.ceil(row.size / UPLOAD_PART_SIZE);
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > partCount) bad("Invalid part number");
  if (Number(c.req.header("content-length")) > UPLOAD_PART_SIZE) bad("Part too large");
  const data = await c.req.arrayBuffer();
  if (data.byteLength === 0 || data.byteLength > UPLOAD_PART_SIZE) bad("Invalid part size");
  const multipart = c.env.UPLOADS.resumeMultipartUpload(row.r2_key, row.r2_upload_id);
  const part = await multipart.uploadPart(partNumber, data);
  return c.json({ partNumber: part.partNumber, etag: part.etag });
});

participant.post("/uploads/:id/complete", async (c) => {
  const row = await getUploadRow(c, "pending");
  const { parts } = await readJson(c);
  if (!Array.isArray(parts) || parts.length === 0) bad("Missing parts");
  const uploaded = parts.map((part: unknown) => {
    const { partNumber, etag } = (part ?? {}) as Record<string, unknown>;
    if (typeof partNumber !== "number" || typeof etag !== "string") bad("Invalid part");
    return { partNumber, etag };
  });
  const multipart = c.env.UPLOADS.resumeMultipartUpload(row.r2_key, row.r2_upload_id);
  const object = await multipart.complete(uploaded);
  if (object.size !== row.size) {
    await c.env.UPLOADS.delete(row.r2_key);
    await c.env.DB.prepare("DELETE FROM uploads WHERE id = ?").bind(row.id).run();
    bad("Uploaded size does not match");
  }
  await c.env.DB.prepare("UPDATE uploads SET status = 'done' WHERE id = ?").bind(row.id).run();
  return c.json(toUpload({ ...row, status: "done" }));
});

// Lets the client abandon a failed upload so parts do not linger in R2.
participant.delete("/uploads/:id", async (c) => {
  const row = await getUploadRow(c, "pending");
  await c.env.UPLOADS.resumeMultipartUpload(row.r2_key, row.r2_upload_id).abort();
  await c.env.DB.prepare("DELETE FROM uploads WHERE id = ?").bind(row.id).run();
  return c.json({ ok: true });
});

app.route("/api/participant", participant);

// ---------------------------------------------------------------- admin

const admin = new Hono<AppEnv>();
admin.use(requireRole("admin"));

admin.get("/data", async (c) => {
  const db = c.env.DB;
  const [settings, teams, materials, prompts, tools, uploads, results, judges, judgeScores] = await Promise.all([
    getSettings(db),
    listResource<AdminTeam>(db, "teams"),
    listResource<Material>(db, "materials"),
    listResource<Prompt>(db, "prompts"),
    listResource<Tool>(db, "tools"),
    db.prepare("SELECT * FROM uploads WHERE status = 'done' ORDER BY team_id, created_at DESC").all<UploadRow>(),
    computeResults(db),
    listResource<Judge>(db, "judges"),
    db.prepare("SELECT judge_id AS judgeId, team_id AS teamId, pitch, demo, impact FROM judge_scores").all<JudgeScore>(),
  ]);
  return c.json({
    settings,
    teams,
    materials,
    prompts,
    tools,
    uploads: uploads.results.map(toUpload),
    results,
    judges,
    judgeScores: judgeScores.results,
  });
});

admin.put("/settings", async (c) => {
  const body = await readJson(c);
  const patch: Partial<Settings> = {};

  for (const key of ["eventName", "tagline", "guidelines"] as const) {
    if (!(key in body)) continue;
    const value = body[key];
    if (typeof value !== "string" || value.length > 10000) bad(`Invalid ${key}`);
    patch[key] = key === "guidelines" ? value : value.trim();
  }
  if (patch.eventName === "") bad("Event name is required");

  const ranges = { hackDurationMin: [1, 24 * 60], voteDurationSec: [10, 60 * 60] } as const;
  for (const key of ["hackDurationMin", "voteDurationSec"] as const) {
    if (!(key in body)) continue;
    const value = body[key];
    const [min, max] = ranges[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
      bad(`${key} must be between ${min} and ${max}`);
    }
    patch[key] = value;
  }

  if ("milestones" in body) {
    const value = body.milestones;
    if (!Array.isArray(value) || value.length > 20) bad("Invalid milestones");
    patch.milestones = value.map((item: unknown) => {
      const { title, minutes, hint = "" } = (item ?? {}) as Record<string, unknown>;
      if (typeof title !== "string" || title.trim() === "" || title.length > 200) bad("Invalid milestone title");
      if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes < 0) bad("Invalid milestone minutes");
      if (typeof hint !== "string" || hint.length > 500) bad("Invalid milestone hint");
      return { title: title.trim(), minutes, hint: hint.trim() };
    });
  }

  await saveSettings(c.env.DB, patch);
  return c.json(await getSettings(c.env.DB));
});

admin.post("/participants/:action", async (c) => {
  const db = c.env.DB;
  switch (c.req.param("action")) {
    case "open":
      await saveSettings(db, { participantAccess: true });
      break;
    case "close":
      // Team sessions stay valid, so reopening lets teams back in without signing in again.
      await saveSettings(db, { participantAccess: false });
      break;
    default:
      bad("Unknown action", 404);
  }
  return c.json(await getSettings(db));
});

admin.post("/timer/:action", async (c) => {
  const db = c.env.DB;
  const settings = await getSettings(db);
  const now = Date.now();
  const running = settings.hackEndsAt !== null && settings.hackEndsAt > now;

  switch (c.req.param("action")) {
    case "start":
      // Starting while paused resumes; starting otherwise begins a fresh run.
      await saveSettings(db, {
        hackEndsAt: now + (settings.hackPausedRemainingMs ?? settings.hackDurationMin * 60_000),
        hackPausedRemainingMs: null,
      });
      break;
    case "pause":
      if (!running) bad("Timer is not running", 409);
      await saveSettings(db, { hackEndsAt: null, hackPausedRemainingMs: settings.hackEndsAt! - now });
      break;
    case "reset":
      await saveSettings(db, { hackEndsAt: null, hackPausedRemainingMs: null });
      break;
    default:
      bad("Unknown action", 404);
  }
  return c.json(await getSettings(db));
});

admin.post("/voting/:action", async (c) => {
  const db = c.env.DB;
  const settings = await getSettings(db);
  const now = Date.now();

  switch (c.req.param("action")) {
    case "open": {
      const teams = await db.prepare("SELECT COUNT(*) AS count FROM teams").first<{ count: number }>();
      if (!teams || teams.count === 0) bad("Create at least one team first", 409);
      // Reopening keeps existing ballots, so it only lets latecomers in.
      await saveSettings(db, { voteEndsAt: now + settings.voteDurationSec * 1000, resultsPublished: false });
      break;
    }
    case "close":
      if (settings.voteEndsAt === null) bad("Voting has not been opened", 409);
      await saveSettings(db, { voteEndsAt: Math.min(settings.voteEndsAt, now) });
      break;
    case "reset":
      await db.batch([
        db.prepare("DELETE FROM ratings"),
        db.prepare("DELETE FROM ballots"),
        ...settingsStatements(db, { voteEndsAt: null, resultsPublished: false }),
      ]);
      break;
    case "publish": {
      if (settings.voteEndsAt === null || now < settings.voteEndsAt) bad("Close voting before publishing", 409);
      // Averaging over different sets of judges would not be fair, so every judge has to score every team.
      const judging = await db
        .prepare(
          "SELECT (SELECT COUNT(*) FROM judges) AS judges, " +
            "(SELECT COUNT(*) FROM judges) * (SELECT COUNT(*) FROM teams) - (SELECT COUNT(*) FROM judge_scores) AS missing",
        )
        .first<{ judges: number; missing: number }>();
      if (judging!.judges === 0) bad("Add at least one judge before publishing", 409);
      if (judging!.missing > 0) {
        bad(`${judging!.missing} judge ${judging!.missing === 1 ? "score is" : "scores are"} missing`, 409);
      }
      await saveSettings(db, { resultsPublished: true });
      break;
    }
    case "unpublish":
      await saveSettings(db, { resultsPublished: false });
      break;
    default:
      bad("Unknown action", 404);
  }
  return c.json(await getSettings(db));
});

async function deleteUploadObjects(env: Env, rows: UploadRow[]): Promise<void> {
  const done = rows.filter((row) => row.status === "done").map((row) => row.r2_key);
  if (done.length > 0) await env.UPLOADS.delete(done);
  await Promise.all(
    rows
      .filter((row) => row.status === "pending")
      .map((row) =>
        env.UPLOADS.resumeMultipartUpload(row.r2_key, row.r2_upload_id)
          .abort()
          .catch(() => undefined),
      ),
  );
}

admin.get("/uploads/:id/download", async (c) => {
  const row = await getUploadRow(c, "done");
  const object = await c.env.UPLOADS.get(row.r2_key);
  if (!object) bad("File is missing from storage", 404);
  return new Response(object.body, {
    headers: {
      "content-type": row.content_type,
      "content-length": String(object.size),
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
    },
  });
});

admin.delete("/uploads/:id", async (c) => {
  const row = await getUploadRow(c);
  await deleteUploadObjects(c.env, [row]);
  await c.env.DB.prepare("DELETE FROM uploads WHERE id = ?").bind(row.id).run();
  return c.json({ ok: true });
});

// Run once the event is over: erases member and judge names and everything teams made, leaving team names and scores.
admin.delete("/participant-data", async (c) => {
  const db = c.env.DB;
  const pending = await db.prepare("SELECT * FROM uploads WHERE status = 'pending'").all<UploadRow>();
  await deleteUploadObjects(c.env, pending.results);
  // Sweep the whole prefix instead of trusting the table, so no file outlives its row.
  let listed: R2Objects;
  do {
    listed = await c.env.UPLOADS.list({ prefix: "teams/" });
    if (listed.objects.length > 0) await c.env.UPLOADS.delete(listed.objects.map((object) => object.key));
  } while (listed.truncated);
  // Storage goes first: if it fails, the rows are still there for a retry.
  await db.batch([
    db.prepare("DELETE FROM uploads"),
    db.prepare("UPDATE teams SET project_title = '', members = '[]', topic_ids = '[]', progress = '[]'"),
    // The scores stay so the results still add up; a blank name also signs the judge out for good.
    db.prepare("UPDATE judges SET name = ''"),
  ]);
  return c.json({ ok: true });
});

function resourceParam(c: AppContext) {
  const name = c.req.param("resource") ?? "";
  if (!isResourceName(name)) bad("Unknown resource", 404);
  return name;
}

/** Teams always need a password; a blank or missing one is replaced with a generated one. */
function withTeamPassword(body: Record<string, unknown>, creating: boolean): Record<string, unknown> {
  const blank = typeof body.password === "string" && body.password.trim() === "";
  if (blank || (creating && !("password" in body))) return { ...body, password: generateTeamPassword() };
  if (typeof body.password === "string" && body.password.trim().length < 4) {
    bad("Team password must be at least 4 characters");
  }
  return body;
}

/** Judges sign in by name, so two judges cannot share one. */
function rejectDuplicate(error: unknown): never {
  if (String(error).includes("UNIQUE")) bad("That name is already taken", 409);
  throw error;
}

admin.post("/resources/:resource", async (c) => {
  const name = resourceParam(c);
  const body = await readJson(c);
  const created = await createResource(c.env.DB, name, name === "teams" ? withTeamPassword(body, true) : body).catch(
    rejectDuplicate,
  );
  return c.json(created, 201);
});

admin.put("/resources/:resource/:id", async (c) => {
  const name = resourceParam(c);
  const body = await readJson(c);
  return c.json(
    await updateResource(c.env.DB, name, idParam(c), name === "teams" ? withTeamPassword(body, false) : body).catch(
      rejectDuplicate,
    ),
  );
});

admin.delete("/resources/:resource/:id", async (c) => {
  const name = resourceParam(c);
  const id = idParam(c);
  if (name === "teams") {
    const { results } = await c.env.DB.prepare("SELECT * FROM uploads WHERE team_id = ?").bind(id).all<UploadRow>();
    await deleteUploadObjects(c.env, results);
  }
  await deleteResource(c.env.DB, name, id);
  return c.json({ ok: true });
});

app.route("/api/admin", admin);

app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

export default app;
