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

function ratingsFor(ids: number[], rating: number) {
  return { ratings: Object.fromEntries(ids.map((id) => [id, rating])) };
}

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

beforeEach(async () => {
  await env.DB.batch(
    ["ratings", "ballots", "uploads", "teams", "topics", "materials", "settings"].map((table) =>
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

  it("limits a team to changing its topics and progress", async () => {
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
    expect((await admin.get("/api/admin/data")).body.teams[0].password).toBe("pass-A");
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
    expect(results).toEqual(ids.map((teamId) => ({ teamId, average: 5, count: 1 })));
  });

  it("shows only the ballot count until results are published", async () => {
    const admin = await adminClient();
    const [a, b] = await createTeams(admin, ["A", "B"]);
    await admin.post("/api/admin/voting/open");
    await new Client().post("/api/vote", { ratings: { [a]: 5, [b]: 2 } });
    await new Client().post("/api/vote", { ratings: { [a]: 4, [b]: 3 } });

    const during = await new Client().get("/api/state");
    expect(during.body.ballotCount).toBe(2);
    expect(during.body.results).toBeNull();

    expect((await admin.post("/api/admin/voting/publish")).status).toBe(409);
    await admin.post("/api/admin/voting/close");
    expect((await new Client().get("/api/state")).body.results).toBeNull();

    expect((await admin.post("/api/admin/voting/publish")).status).toBe(200);
    const after = await new Client().get("/api/state");
    expect(after.body.results).toEqual([
      { teamId: a, average: 4.5, count: 2 },
      { teamId: b, average: 2.5, count: 2 },
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
