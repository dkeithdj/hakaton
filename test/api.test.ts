import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../worker/index";

/** Minimal cookie jar so each client keeps its own session and voter id. */
class Client {
  private cookies = new Map<string, string>();

  async request(method: string, path: string, body?: unknown) {
    const response = await app.request(
      path,
      {
        method,
        headers: {
          // Browsers send Origin on same-origin POSTs; the CSRF check needs it for bodyless ones.
          origin: "http://localhost",
          cookie: [...this.cookies].map(([name, value]) => `${name}=${value}`).join("; "),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      env,
    );
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const index = pair.indexOf("=");
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }
    return { status: response.status, body: (await response.json()) as any };
  }

  get = (path: string) => this.request("GET", path);
  post = (path: string, body?: unknown) => this.request("POST", path, body);
  put = (path: string, body?: unknown) => this.request("PUT", path, body);
}

async function adminClient() {
  const client = new Client();
  const login = await client.post("/api/login", { role: "admin", password: "test-admin" });
  expect(login.status).toBe(200);
  return client;
}

/** Every team created here gets the password `pass-<name>`. */
async function createTeams(admin: Client, names: string[]): Promise<number[]> {
  const ids: number[] = [];
  for (const name of names) {
    const created = await admin.post("/api/admin/resources/teams", { name, members: [], password: `pass-${name}` });
    expect(created.status).toBe(201);
    ids.push(created.body.id);
  }
  return ids;
}

async function teamClient(teamId: number, name: string) {
  const client = new Client();
  const login = await client.post("/api/login", { role: "participant", teamId, password: `pass-${name}` });
  expect(login.status).toBe(200);
  return client;
}

/** Splits a total out of 100 across the criteria in their 25/40/35 proportions. */
function points(total: number) {
  return { pitch: total * 0.25, demo: total * 0.4, impact: total * 0.35 };
}

/** Adds the judge as the admin would, signs them in, and optionally scores teams with the given totals. */
async function judgeClient(admin: Client, username: string, totals?: Record<number, number>) {
  expect((await admin.post("/api/admin/resources/judges", { name: username })).status).toBe(201);
  const client = new Client();
  const login = await client.post("/api/judge/login", { username });
  expect(login.status).toBe(200);
  if (totals) {
    const scores = Object.fromEntries(Object.entries(totals).map(([teamId, total]) => [teamId, points(total)]));
    expect((await client.put("/api/judge/scores", { scores })).status).toBe(200);
  }
  return client;
}

function ratingsFor(ids: number[], rating: number) {
  return { ratings: Object.fromEntries(ids.map((id) => [id, rating])) };
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch(
    ["judge_scores", "judges", "ratings", "ballots", "uploads", "teams", "topics", "materials", "settings"].map((table) =>
      env.DB.prepare(`DELETE FROM ${table}`),
    ),
  );
});

describe("auth", () => {
  it("rejects wrong passwords and unauthenticated access", async () => {
    const client = new Client();
    expect((await client.post("/api/login", { role: "admin", password: "nope" })).status).toBe(401);
    expect((await client.get("/api/admin/data")).status).toBe(401);
    expect((await client.get("/api/participant/content")).status).toBe(401);
  });

  it("signs a team in only with that team's own password", async () => {
    const admin = await adminClient();
    const [a, b] = await createTeams(admin, ["A", "B"]);
    const client = new Client();
    expect((await client.post("/api/login", { role: "participant", teamId: a, password: "pass-B" })).status).toBe(401);
    expect((await client.post("/api/login", { role: "participant", teamId: b, password: "" })).status).toBe(401);
    expect((await client.post("/api/login", { role: "participant", password: "pass-A" })).status).toBe(400);
    expect((await client.post("/api/login", { role: "participant", teamId: a, password: "pass-A" })).status).toBe(200);
    expect((await client.get("/api/me")).body).toEqual({ role: "participant", teamId: a });
  });

  it("keeps teams out of admin routes", async () => {
    const admin = await adminClient();
    const [a] = await createTeams(admin, ["A"]);
    const client = await teamClient(a, "A");
    expect((await client.get("/api/participant/content")).status).toBe(200);
    expect((await client.get("/api/admin/data")).status).toBe(401);
  });

  it("keeps a team out of every other team's data", async () => {
    const admin = await adminClient();
    const [a, b] = await createTeams(admin, ["A", "B"]);
    const teamA = await teamClient(a, "A");
    const teamB = await teamClient(b, "B");

    expect((await teamA.put(`/api/participant/teams/${b}`, { progress: [0] })).status).toBe(403);
    expect((await teamA.get(`/api/participant/uploads?teamId=${b}`)).status).toBe(403);
    const upload = { kind: "deck", filename: "deck.pdf", size: 1000 };
    expect((await teamA.post("/api/participant/uploads", { ...upload, teamId: b })).status).toBe(403);

    // Team B starts an upload; team A cannot add parts to, complete, or cancel it.
    const started = await teamB.post("/api/participant/uploads", { ...upload, teamId: b });
    expect(started.status).toBe(200);
    const path = `/api/participant/uploads/${started.body.id}`;
    expect((await teamA.post(`${path}/complete`, { parts: [{ partNumber: 1, etag: "x" }] })).status).toBe(403);
    expect((await teamA.request("DELETE", path)).status).toBe(403);
    expect((await teamB.request("DELETE", path)).status).toBe(200);

    expect((await teamA.put(`/api/participant/teams/${a}`, { progress: [0] })).status).toBe(200);
    expect((await admin.put(`/api/participant/teams/${b}`, { progress: [1] })).status).toBe(200);
  });

  it("signs a team out when the admin changes its password", async () => {
    const admin = await adminClient();
    const [a] = await createTeams(admin, ["A"]);
    const client = await teamClient(a, "A");
    expect((await admin.put(`/api/admin/resources/teams/${a}`, { password: "changed" })).status).toBe(200);
    expect((await client.get("/api/participant/content")).status).toBe(401);
    expect((await client.post("/api/login", { role: "participant", teamId: a, password: "pass-A" })).status).toBe(401);
    expect((await client.post("/api/login", { role: "participant", teamId: a, password: "changed" })).status).toBe(200);
  });

  it("generates a password when the admin leaves it blank", async () => {
    const admin = await adminClient();
    const created = await admin.post("/api/admin/resources/teams", { name: "A", password: "" });
    expect(created.body.password).toMatch(/^[a-z0-9]{6}$/);
    const other = await admin.post("/api/admin/resources/teams", { name: "B" });
    expect(other.body.password).toMatch(/^[a-z0-9]{6}$/);
    expect((await admin.put(`/api/admin/resources/teams/${created.body.id}`, { password: "abc" })).status).toBe(400);
  });

  it("never exposes team passwords outside admin routes", async () => {
    const admin = await adminClient();
    const [a] = await createTeams(admin, ["A"]);
    expect(JSON.stringify((await new Client().get("/api/state")).body)).not.toContain("pass-A");
    const client = await teamClient(a, "A");
    const updated = await client.put(`/api/participant/teams/${a}`, { progress: [0] });
    expect(JSON.stringify(updated.body)).not.toContain("pass-A");
    expect((await admin.get("/api/admin/data")).body.teams[0].password).toBe("pass-A");
  });

  it("limits a team to changing its project title, topics, and progress", async () => {
    const admin = await adminClient();
    const [teamId] = await createTeams(admin, ["A"]);
    const client = await teamClient(teamId, "A");
    const topics: number[] = [];
    for (const title of ["No Poverty", "Quality Education"]) {
      topics.push((await admin.post("/api/admin/resources/topics", { title, color: "#E5243B" })).body.id);
    }
    const chosen = await client.put(`/api/participant/teams/${teamId}`, { topicIds: [topics[1], topics[0]] });
    expect(chosen.body.topicIds).toEqual([...topics].sort((a, b) => a - b));
    expect((await client.put(`/api/participant/teams/${teamId}`, { topicIds: [topics[0], 999_999] })).status).toBe(400);
    expect((await client.put(`/api/participant/teams/${teamId}`, { topicIds: [] })).body.topicIds).toEqual([]);
    const updated = await client.put(`/api/participant/teams/${teamId}`, {
      name: "Renamed",
      password: "hijacked",
      progress: [2, 0, 2],
    });
    expect(updated.body.name).toBe("A");
    expect(updated.body.progress).toEqual([0, 2]);

    // Voters and judges read the title from the public state.
    const titled = await client.put(`/api/participant/teams/${teamId}`, { projectTitle: "  Flood Watch  " });
    expect(titled.body.projectTitle).toBe("Flood Watch");
    expect((await new Client().get("/api/state")).body.teams[0].projectTitle).toBe("Flood Watch");
    expect((await client.put(`/api/participant/teams/${teamId}`, { projectTitle: "x".repeat(101) })).status).toBe(400);
    expect((await client.put(`/api/participant/teams/${teamId}`, { projectTitle: "" })).body.projectTitle).toBe("");
    expect((await admin.get("/api/admin/data")).body.teams[0].password).toBe("pass-A");
  });
});

describe("participant data", () => {
  it("erases member names, judge names, team work, and uploads, leaving team names and scores", async () => {
    const admin = await adminClient();
    const created = await admin.post("/api/admin/resources/teams", { name: "A", members: ["Ann", "Bo"], password: "pass-A" });
    const teamId: number = created.body.id;
    const topic = await admin.post("/api/admin/resources/topics", { title: "No Poverty" });
    const team = await teamClient(teamId, "A");
    await team.put(`/api/participant/teams/${teamId}`, { projectTitle: "Flood Watch", topicIds: [topic.body.id], progress: [0, 1] });

    const key = `teams/${teamId}/deck/backup.pdf`;
    await env.UPLOADS.put(key, "deck");
    await env.DB.prepare(
      "INSERT INTO uploads (team_id, kind, filename, size, r2_key, r2_upload_id, status, created_at) " +
        "VALUES (?, 'deck', 'backup.pdf', 4, ?, '', 'done', 0)",
    )
      .bind(teamId, key)
      .run();

    await admin.post("/api/admin/voting/open");
    await new Client().post("/api/vote", ratingsFor([teamId], 4));
    const judge = await judgeClient(admin, "Judge Ana", { [teamId]: 90 });

    expect((await team.request("DELETE", "/api/admin/participant-data")).status).toBe(401);
    expect((await admin.get("/api/admin/data")).body.uploads).toHaveLength(1);

    expect((await admin.request("DELETE", "/api/admin/participant-data")).status).toBe(200);
    const state = (await new Client().get("/api/state")).body;
    expect(state.teams).toEqual([{ id: teamId, name: "A", projectTitle: "", members: [], topicIds: [], progress: [], sort: 0 }]);
    const data = (await admin.get("/api/admin/data")).body;
    expect(data.uploads).toEqual([]);
    expect(data.results).toEqual([
      { teamId, final: 88, judgeAverage: 90, judgeCount: 1, audienceAverage: 4, audienceCount: 1 },
    ]);
    expect(data.judges).toEqual([{ id: expect.any(Number), name: "", sort: 0 }]);
    expect((await judge.get("/api/judge")).body.judge).toBeNull();
    expect((await judge.put("/api/judge/scores", { scores: { [teamId]: points(1) } })).status).toBe(401);
    expect((await new Client().post("/api/judge/login", { username: "" })).status).toBe(400);
    expect(await env.UPLOADS.get(key)).toBeNull();
    expect((await env.UPLOADS.list({ prefix: "teams/" })).objects).toEqual([]);
  });
});

describe("organizer resources", () => {
  it("lets the admin publish links and templates that signed-in teams can read", async () => {
    const admin = await adminClient();
    const [a] = await createTeams(admin, ["A"]);
    const material = { title: "Deck template", description: "Paste into your AI", url: "https://example.com/deck", body: "Slide 1" };
    expect((await admin.post("/api/admin/resources/materials", material)).status).toBe(201);
    expect((await admin.post("/api/admin/resources/materials", { title: "" })).status).toBe(400);

    const team = await teamClient(a, "A");
    expect((await team.get("/api/participant/content")).body.materials).toMatchObject([material]);
    expect((await team.post("/api/admin/resources/materials", material)).status).toBe(401);
    expect((await new Client().get("/api/participant/content")).status).toBe(401);
  });
});

describe("timer", () => {
  it("starts, pauses with the remaining time, and resumes", async () => {
    const admin = await adminClient();
    const started = await admin.post("/api/admin/timer/start");
    expect(started.body.hackEndsAt).toBeGreaterThan(Date.now() + 179 * 60_000);

    const paused = await admin.post("/api/admin/timer/pause");
    expect(paused.body.hackEndsAt).toBeNull();
    expect(paused.body.hackPausedRemainingMs).toBeGreaterThan(179 * 60_000);

    const resumed = await admin.post("/api/admin/timer/start");
    expect(resumed.body.hackPausedRemainingMs).toBeNull();
    expect(resumed.body.hackEndsAt).toBeLessThanOrEqual(Date.now() + 180 * 60_000);
  });
});

describe("voting", () => {
  it("rejects votes before voting opens", async () => {
    const admin = await adminClient();
    const ids = await createTeams(admin, ["A", "B"]);
    expect((await new Client().post("/api/vote", ratingsFor(ids, 5))).status).toBe(403);
  });

  it("requires a 1-5 rating for every team", async () => {
    const admin = await adminClient();
    const ids = await createTeams(admin, ["A", "B"]);
    await admin.post("/api/admin/voting/open");
    const voter = new Client();
    expect((await voter.post("/api/vote", ratingsFor([ids[0]], 5))).status).toBe(400);
    expect((await voter.post("/api/vote", ratingsFor(ids, 6))).status).toBe(400);
    expect((await voter.post("/api/vote", ratingsFor(ids, 0))).status).toBe(400);
    expect((await voter.post("/api/vote", { ratings: { [ids[0]]: 5, 9999: 5 } })).status).toBe(400);
    expect((await voter.get("/api/vote/status")).body.hasVoted).toBe(false);
  });

  it("accepts one ballot per voter", async () => {
    const admin = await adminClient();
    const ids = await createTeams(admin, ["A", "B"]);
    await admin.post("/api/admin/voting/open");
    const voter = new Client();
    expect((await voter.post("/api/vote", ratingsFor(ids, 5))).status).toBe(200);
    expect((await voter.post("/api/vote", ratingsFor(ids, 1))).status).toBe(409);
    expect((await voter.get("/api/vote/status")).body.hasVoted).toBe(true);

    const results = (await admin.get("/api/admin/data")).body.results;
    expect(results).toEqual(
      ids.map((teamId) => ({ teamId, final: 20, judgeAverage: null, judgeCount: 0, audienceAverage: 5, audienceCount: 1 })),
    );
  });

  it("shows only the ballot count until results are published", async () => {
    const admin = await adminClient();
    const [a, b] = await createTeams(admin, ["A", "B"]);
    await admin.post("/api/admin/voting/open");
    await new Client().post("/api/vote", { ratings: { [a]: 5, [b]: 2 } });
    await new Client().post("/api/vote", { ratings: { [a]: 4, [b]: 3 } });
    await judgeClient(admin, "Ana", { [a]: 80, [b]: 50 });

    const during = await new Client().get("/api/state");
    expect(during.body.ballotCount).toBe(2);
    expect(during.body.results).toBeNull();

    expect((await admin.post("/api/admin/voting/publish")).status).toBe(409);
    await admin.post("/api/admin/voting/close");
    expect((await new Client().get("/api/state")).body.results).toBeNull();

    expect((await admin.post("/api/admin/voting/publish")).status).toBe(200);
    const after = await new Client().get("/api/state");
    expect(after.body.results).toEqual([
      { teamId: a, final: expect.closeTo(82), judgeAverage: 80, judgeCount: 1, audienceAverage: 4.5, audienceCount: 2 },
      { teamId: b, final: expect.closeTo(50), judgeAverage: 50, judgeCount: 1, audienceAverage: 2.5, audienceCount: 2 },
    ]);
  });

  it("rejects votes once the admin closes voting", async () => {
    const admin = await adminClient();
    const ids = await createTeams(admin, ["A"]);
    await admin.post("/api/admin/voting/open");
    await admin.post("/api/admin/voting/close");
    expect((await new Client().post("/api/vote", ratingsFor(ids, 3))).status).toBe(403);
  });

  it("rejects votes once the voting window has elapsed", async () => {
    const admin = await adminClient();
    const ids = await createTeams(admin, ["A"]);
    await admin.post("/api/admin/voting/open");
    await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'voteEndsAt'")
      .bind(JSON.stringify(Date.now() - 1))
      .run();
    expect((await new Client().post("/api/vote", ratingsFor(ids, 3))).status).toBe(403);
  });

  it("clears ballots on reset so voters can vote again", async () => {
    const admin = await adminClient();
    const ids = await createTeams(admin, ["A"]);
    await admin.post("/api/admin/voting/open");
    const voter = new Client();
    await voter.post("/api/vote", ratingsFor(ids, 3));
    await admin.post("/api/admin/voting/reset");
    expect((await voter.get("/api/vote/status")).body.hasVoted).toBe(false);
    expect((await new Client().get("/api/state")).body.ballotCount).toBe(0);
    await admin.post("/api/admin/voting/open");
    expect((await voter.post("/api/vote", ratingsFor(ids, 4))).status).toBe(200);
  });
});

describe("judging", () => {
  it("signs in only judges the admin added, and takes scores without voting being open", async () => {
    const admin = await adminClient();
    const [a, b] = await createTeams(admin, ["A", "B"]);

    const stranger = new Client();
    expect((await stranger.get("/api/judge")).body).toEqual({ judge: null, scores: {} });
    expect((await stranger.put("/api/judge/scores", { scores: { [a]: points(50) } })).status).toBe(401);
    expect((await stranger.post("/api/judge/login", { username: "Ana" })).status).toBe(401);
    expect((await stranger.post("/api/judge/login", { username: "   " })).status).toBe(400);
    expect((await stranger.post("/api/admin/resources/judges", { name: "Ana" })).status).toBe(401);
    expect((await admin.get("/api/admin/data")).body.judges).toEqual([]);

    const judge = await judgeClient(admin, "Ana");
    expect((await admin.post("/api/admin/resources/judges", { name: "ana" })).status).toBe(409);

    const full = { pitch: 25, demo: 40, impact: 35 };
    for (const invalid of [
      { ...full, pitch: 26 },
      { ...full, demo: 41 },
      { ...full, impact: 36 },
      { ...full, pitch: -1 },
      { ...full, demo: "40" },
      { pitch: 20, demo: 30 },
      90,
    ]) {
      expect((await judge.put("/api/judge/scores", { scores: { [a]: invalid } })).status).toBe(400);
    }
    expect((await judge.put("/api/judge/scores", { scores: { 9999: full } })).status).toBe(400);

    const scores = { [a]: { pitch: 20.5, demo: 32, impact: 35 }, [b]: { pitch: 10, demo: 20, impact: 30 } };
    const saved = await judge.put("/api/judge/scores", { scores });
    expect(saved.body.scores).toEqual(scores);
    expect((await admin.get("/api/admin/data")).body.results.map((result: any) => result.judgeAverage)).toEqual([87.5, 60]);

    // The same username on another device, in any letter case, is the same judge.
    const again = await new Client().post("/api/judge/login", { username: "  ana " });
    expect(again.body).toEqual({ judge: saved.body.judge, scores });

    const cleared = await judge.put("/api/judge/scores", { scores: { [b]: null } });
    expect(cleared.body.scores).toEqual({ [a]: scores[a] });
  });

  it("weights the judge average at 80% and the audience at 20% for any number of judges", async () => {
    const admin = await adminClient();
    const [a, b] = await createTeams(admin, ["A", "B"]);
    await admin.post("/api/admin/voting/open");
    await new Client().post("/api/vote", { ratings: { [a]: 5, [b]: 3 } });
    await judgeClient(admin, "One", { [a]: 60, [b]: 90 });
    await judgeClient(admin, "Two", { [a]: 80, [b]: 100 });

    const results = async () => (await admin.get("/api/admin/data")).body.results;
    expect(await results()).toEqual([
      { teamId: a, final: expect.closeTo(76), judgeAverage: 70, judgeCount: 2, audienceAverage: 5, audienceCount: 1 },
      { teamId: b, final: expect.closeTo(88), judgeAverage: 95, judgeCount: 2, audienceAverage: 3, audienceCount: 1 },
    ]);

    await judgeClient(admin, "Three", { [a]: 100, [b]: 50 });
    expect(await results()).toEqual([
      { teamId: a, final: expect.closeTo(84), judgeAverage: 80, judgeCount: 3, audienceAverage: 5, audienceCount: 1 },
      { teamId: b, final: expect.closeTo(76), judgeAverage: 80, judgeCount: 3, audienceAverage: 3, audienceCount: 1 },
    ]);
  });

  it("publishes only once every judge has scored every team, then locks the scores", async () => {
    const admin = await adminClient();
    const [a, b] = await createTeams(admin, ["A", "B"]);
    await admin.post("/api/admin/voting/open");
    await admin.post("/api/admin/voting/close");

    const none = await admin.post("/api/admin/voting/publish");
    expect(none).toEqual({ status: 409, body: { error: "Add at least one judge before publishing" } });

    const judge = await judgeClient(admin, "Ana", { [a]: 80 });
    const partial = await admin.post("/api/admin/voting/publish");
    expect(partial).toEqual({ status: 409, body: { error: "1 judge score is missing" } });

    // Judging does not depend on the voting window, so it still works after voting has closed.
    expect((await judge.put("/api/judge/scores", { scores: { [b]: points(40) } })).status).toBe(200);
    expect((await admin.post("/api/admin/voting/publish")).status).toBe(200);
    expect((await judge.put("/api/judge/scores", { scores: { [b]: points(100) } })).status).toBe(403);

    await admin.post("/api/admin/voting/unpublish");
    expect((await judge.put("/api/judge/scores", { scores: { [b]: points(100) } })).status).toBe(200);
  });

  it("lets only the admin remove a judge, which drops that judge's scores", async () => {
    const admin = await adminClient();
    const [a] = await createTeams(admin, ["A"]);
    const stray = await judgeClient(admin, "Stray", { [a]: 0 });
    await judgeClient(admin, "Ana", { [a]: 90 });
    const strayId: number = (await stray.get("/api/judge")).body.judge.id;

    expect((await stray.request("DELETE", `/api/admin/resources/judges/${strayId}`)).status).toBe(401);
    expect((await admin.request("DELETE", `/api/admin/resources/judges/${strayId}`)).status).toBe(200);

    const data = (await admin.get("/api/admin/data")).body;
    expect(data.judges.map((judge: { name: string }) => judge.name)).toEqual(["Ana"]);
    expect(data.judgeScores).toEqual([{ judgeId: expect.any(Number), teamId: a, ...points(90) }]);
    expect(data.results[0].judgeAverage).toBe(90);
    expect((await stray.get("/api/judge")).body.judge).toBeNull();
  });

  it("keeps judges and their scores out of the public state", async () => {
    const admin = await adminClient();
    const [a] = await createTeams(admin, ["A"]);
    await judgeClient(admin, "Secret Judge", { [a]: 42 });
    const state = await new Client().get("/api/state");
    expect(state.body.results).toBeNull();
    expect(JSON.stringify(state.body)).not.toContain("Secret Judge");
  });
});

describe("settings", () => {
  it("stores an optional hint with each milestone", async () => {
    const admin = await adminClient();
    const saved = await admin.put("/api/admin/settings", {
      milestones: [{ title: "Build", minutes: 90, hint: " Build **one flow**. " }, { title: "Pitch", minutes: 15 }],
    });
    expect(saved.body.milestones).toEqual([
      { title: "Build", minutes: 90, hint: "Build **one flow**." },
      { title: "Pitch", minutes: 15, hint: "" },
    ]);
    expect((await new Client().get("/api/state")).body.settings.milestones[0].hint).toBe("Build **one flow**.");
    expect((await admin.put("/api/admin/settings", { milestones: [{ title: "Build", minutes: 1, hint: 5 }] })).status).toBe(400);
  });
});
