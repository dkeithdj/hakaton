import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Admin from "@/pages/Admin";
import Judge from "@/pages/Judge";
import Participant from "@/pages/Participant";
import Privacy from "@/pages/Privacy";
import Viewer from "@/pages/Viewer";
import Vote from "@/pages/Vote";
import type { EventState, PublicSettings, Role, TeamResult } from "../shared/types";

const baseSettings: PublicSettings = {
  eventName: "Test Hack",
  tagline: "Tagline",
  guidelines: "**Length:** five minutes total.\n- Pitch\n- Demo",
  milestones: [
    { title: "Define the problem", minutes: 45, hint: "Agree on **who** has the problem." },
    { title: "Build the prototype", minutes: 90, hint: "Build **one flow** end to end." },
  ],
  hackDurationMin: 180,
  voteDurationSec: 120,
  hackEndsAt: null,
  hackPausedRemainingMs: null,
  voteEndsAt: null,
  resultsPublished: false,
  participantAccess: true,
};

function makeState(settings: Partial<PublicSettings> = {}, extra: Partial<EventState> = {}): EventState {
  return {
    serverNow: Date.now(),
    settings: { ...baseSettings, ...settings },
    teams: [
      { id: 1, name: "Team Alpha", projectTitle: "Flood Watch", members: ["Ann", "Bo"], topicIds: [2], progress: [0], sort: 1 },
      { id: 2, name: "Team Bravo", projectTitle: "", members: ["Cy"], topicIds: [], progress: [], sort: 2 },
    ],
    topics: [
      { id: 1, title: "No Poverty", description: "End poverty.", color: "#E5243B", sort: 1 },
      { id: 2, title: "Quality Education", description: "Help teachers.", color: "#C5192D", sort: 4 },
    ],
    schedule: [{ id: 1, timeLabel: "1:00 PM", title: "Kickoff", description: "", sort: 1 }],
    ballotCount: 7,
    results: null,
    ...extra,
  };
}

const results: TeamResult[] = [
  { teamId: 1, final: 70, judgeAverage: 70, judgeCount: 2, audienceAverage: 3.5, audienceCount: 7 },
  { teamId: 2, final: 85, judgeAverage: 85, judgeCount: 2, audienceAverage: 4.25, audienceCount: 7 },
];

let routes: Record<string, unknown>;
let calls: { method: string; path: string; body: unknown }[];

function mockApi(state: EventState, role: Role | null, hasVoted = false) {
  routes = {
    "/api/state": state,
    "/api/me": { role, teamId: role === "participant" ? 1 : null },
    "/api/vote/status": { hasVoted },
    "/api/vote": { ok: true },
    "/api/participant/content": {
      materials: [
        { id: 1, title: "Pitch deck template", description: "Paste into your AI.", url: "https://example.com/deck", body: "Slide 1 - Title", sort: 1 },
      ],
      prompts: [{ id: 1, title: "Define the problem", tool: "Claude", body: "Ask us five questions.", sort: 1 }],
      tools: [
        { id: 1, name: "Claude", description: "Thinking partner.", url: "https://claude.ai", vendor: "Anthropic", color: "#D97757", sort: 2 },
        { id: 2, name: "Gemini", description: "Free with a Google account.", url: "https://gemini.google.com", vendor: "Google", color: "#4285F4", sort: 1 },
      ],
    },
    "/api/tools": [
      { id: 1, name: "Claude", description: "Thinking partner.", url: "https://claude.ai", vendor: "Anthropic", color: "#D97757", sort: 2 },
      { id: 2, name: "Gemini", description: "Free with a Google account.", url: "https://gemini.google.com", vendor: "Google", color: "#4285F4", sort: 1 },
    ],
    "/api/participant/uploads": [],
    "/api/admin/data": {
      settings: state.settings,
      teams: state.teams.map((team) => ({ ...team, password: `pw-${team.id}` })),
      materials: [{ id: 1, title: "Pitch deck template", description: "", url: "", body: "Slide 1 - Title", sort: 1 }],
      prompts: [],
      tools: [],
      uploads: [{ id: 1, teamId: 1, kind: "deck", filename: "deck.pdf", size: 2_000_000, createdAt: Date.now() }],
      results,
      judges: [
        { id: 1, name: "Ana", sort: 1 },
        { id: 2, name: "Ben", sort: 2 },
      ],
      judgeScores: [
        { judgeId: 1, teamId: 1, pitch: 15, demo: 24, impact: 21 },
        { judgeId: 1, teamId: 2, pitch: 22, demo: 36, impact: 32 },
        { judgeId: 2, teamId: 1, pitch: 20, demo: 32, impact: 28 },
      ],
    },
    "/api/judge": { judge: null, scores: {} },
  };
}

function renderPage(page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  calls = [];
  localStorage.clear();
  // Radix needs these and jsdom lacks them.
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.hasPointerCapture = () => false;
  vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
    const path = input.split("?")[0];
    calls.push({ method: init?.method ?? "GET", path, body: init?.body ? JSON.parse(init.body as string) : undefined });
    if (!(path in routes)) return new Response(JSON.stringify({ error: `unmocked ${path}` }), { status: 404 });
    return new Response(JSON.stringify(routes[path]));
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("viewer shows the timer, schedule, and team progress", async () => {
  mockApi(makeState(), null);
  renderPage(<Viewer />);
  expect(await screen.findByRole("heading", { name: "Test Hack" })).toBeTruthy();
  expect(screen.getByRole("img", { name: "Test Hack" }).getAttribute("src")).toBe("/assets/subay.webp");
  expect(screen.getByText("03:00:00")).toBeTruthy();
  expect(screen.getByText("Kickoff")).toBeTruthy();
  expect(screen.getByText("Team Alpha")).toBeTruthy();
  expect(screen.getByText("1/2")).toBeTruthy();
  expect(screen.getByRole("img", { name: "SGD 4: Quality Education" })).toBeTruthy();
  expect(screen.getByText("No SGD chosen yet")).toBeTruthy();
  expect(screen.getByRole("img", { name: "DEVCON Davao" }).closest("a")?.getAttribute("href")).toBe("https://devcon.ph");
  expect(screen.getByRole("img", { name: "She is DEVCON" })).toBeTruthy();
});

it("viewer turns into a big-screen voting display with QR, countdown, and count", async () => {
  mockApi(makeState({ voteEndsAt: Date.now() + 60_000 }), null);
  const { container } = renderPage(<Viewer />);
  expect(await screen.findByRole("heading", { name: "Scan to vote" })).toBeTruthy();
  expect(screen.getByText("7")).toBeTruthy();
  expect(screen.getByText("votes registered")).toBeTruthy();
  expect(screen.getByText(/^0[01]:\d\d$/)).toBeTruthy();
  expect(container.querySelector("main svg")).toBeTruthy();
  expect(screen.queryByText(/\/ 5/)).toBeNull();
  expect(screen.queryByText("Program flow")).toBeNull();
});

it("viewer keeps the count on screen after voting closes", async () => {
  mockApi(makeState({ voteEndsAt: Date.now() - 1000 }), null);
  renderPage(<Viewer />);
  expect(await screen.findByRole("heading", { name: "Voting is closed" })).toBeTruthy();
  expect(screen.getByText("7")).toBeTruthy();
  expect(screen.queryByText(/\/ 5/)).toBeNull();
});

it("viewer shows scores once results are published", async () => {
  mockApi(makeState({ voteEndsAt: Date.now() - 1000, resultsPublished: true }, { results }), null);
  renderPage(<Viewer />);
  expect(await screen.findByText("1. Team Bravo")).toBeTruthy();
  expect(screen.getByText("85.0 / 100")).toBeTruthy();
  expect(screen.getByText(/Judges 85\.0 \/ 100 · Audience 4\.25 \/ 5 \(7 votes\)/)).toBeTruthy();
  expect(screen.getByText(/80% judges, 20% audience vote/)).toBeTruthy();
});

it("vote page waits until voting opens", async () => {
  mockApi(makeState(), null);
  renderPage(<Vote />);
  expect(await screen.findByText("Voting has not opened yet")).toBeTruthy();
});

it("vote page submits a rating for every team", async () => {
  const user = userEvent.setup();
  mockApi(makeState({ voteEndsAt: Date.now() + 60_000 }), null);
  renderPage(<Vote />);
  const submit = await screen.findByRole("button", { name: "Submit vote" });
  expect((submit as HTMLButtonElement).disabled).toBe(true);

  // The project title reminds voters what each team built.
  expect(screen.getByText("Flood Watch")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Rate Team Alpha 4 out of 5" }));
  expect((submit as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole("button", { name: "Rate Team Bravo 5 out of 5" }));
  expect(screen.getByText("2 of 2 rated")).toBeTruthy();

  routes["/api/vote/status"] = { hasVoted: true };
  await user.click(submit);
  expect(await screen.findByText("Thanks, your vote is in")).toBeTruthy();
  expect(calls.find((call) => call.method === "POST" && call.path === "/api/vote")?.body).toEqual({
    ratings: { 1: 4, 2: 5 },
  });
});

it("vote page disables rating once voting has closed", async () => {
  mockApi(makeState({ voteEndsAt: Date.now() - 1000 }), null);
  renderPage(<Vote />);
  const closed = await screen.findByRole("button", { name: "Voting is closed" });
  expect((closed as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByRole("button", { name: "Rate Team Alpha 4 out of 5" }) as HTMLButtonElement).disabled).toBe(true);
});

const ana = { id: 1, name: "Ana", sort: 1 };

it("judge page asks for a username when signed out", async () => {
  const user = userEvent.setup();
  mockApi(makeState(), null);
  routes["/api/judge/login"] = { judge: ana, scores: {} };
  renderPage(<Judge />);
  await user.type(await screen.findByLabelText("Username"), "Ana");
  await user.click(screen.getByRole("button", { name: "Enter" }));
  expect(await screen.findByText("Judging as Ana")).toBeTruthy();
  expect(calls.find((call) => call.path === "/api/judge/login")?.body).toEqual({ username: "Ana" });
});

it("judge page saves pitch, demo, and impact points for each team, with voting not open", async () => {
  const user = userEvent.setup();
  const alpha = { pitch: 15, demo: 24, impact: 21 };
  const bravo = { pitch: 20, demo: 38.5, impact: 30 };
  mockApi(makeState(), null);
  routes["/api/judge"] = { judge: ana, scores: { 1: alpha } };
  routes["/api/judge/scores"] = { judge: ana, scores: { 1: alpha, 2: bravo } };
  renderPage(<Judge />);
  expect(((await screen.findByLabelText("Team Alpha demo out of 40")) as HTMLInputElement).value).toBe("24");
  expect(screen.getByText("60 / 100")).toBeTruthy();
  expect(screen.getByText("Flood Watch")).toBeTruthy();
  expect(screen.getByText("1 of 2 scored")).toBeTruthy();
  const save = screen.getByRole("button", { name: "Save scores" }) as HTMLButtonElement;
  expect(save.disabled).toBe(true);

  // A team needs all three criteria, each within its own maximum.
  await user.type(screen.getByLabelText("Team Bravo pitch out of 25"), "26");
  await user.type(screen.getByLabelText("Team Bravo demo out of 40"), "38.5");
  expect(save.disabled).toBe(true);
  await user.type(screen.getByLabelText("Team Bravo impact out of 35"), "30");
  expect(save.disabled).toBe(true);
  await user.clear(screen.getByLabelText("Team Bravo pitch out of 25"));
  await user.type(screen.getByLabelText("Team Bravo pitch out of 25"), "20");
  expect(screen.getByText("88.5 / 100")).toBeTruthy();
  await user.click(save);
  expect(await screen.findByText("2 of 2 scored")).toBeTruthy();
  expect(calls.find((call) => call.path === "/api/judge/scores")).toEqual({
    method: "PUT",
    path: "/api/judge/scores",
    body: { scores: { 1: alpha, 2: bravo } },
  });
});

it("judge page locks scores once results are published", async () => {
  mockApi(makeState({ voteEndsAt: Date.now() - 1000, resultsPublished: true }, { results }), null);
  routes["/api/judge"] = { judge: ana, scores: { 1: { pitch: 15, demo: 24, impact: 21 } } };
  renderPage(<Judge />);
  expect(((await screen.findByLabelText("Team Alpha pitch out of 25")) as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByText("Results are published, so scores are locked.")).toBeTruthy();
});

it("participant page asks for a team and its password when signed out", async () => {
  mockApi(makeState(), null);
  renderPage(<Participant />);
  expect(await screen.findByLabelText("Team password")).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Team" })).toBeTruthy();
  expect((screen.getByRole("button", { name: "Enter" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByText("Your challenge")).toBeNull();
});

it("participant page stays shut until the admin opens participant access", async () => {
  mockApi(makeState({ participantAccess: false }), "participant");
  renderPage(<Participant />);
  expect(await screen.findByText("The workspace is not open yet")).toBeTruthy();
  // Guidelines and the toolbox are there to prepare with; the rest waits for the event.
  expect(screen.getByText("Length:").tagName).toBe("STRONG");
  expect((await screen.findByText("Start here: Google tools")).closest("div.overflow-hidden")!.textContent).toContain("Gemini");
  expect(screen.getByRole("link", { name: /Claude/ }).getAttribute("href")).toBe("https://claude.ai");
  expect(screen.queryByText("Prompt library")).toBeNull();
  expect(calls.some((call) => call.path.startsWith("/api/participant/"))).toBe(false);
  expect(screen.queryByLabelText("Team password")).toBeNull();
  expect(screen.queryByText("Your challenge")).toBeNull();
});

it("admin opens participant access from the control tab", async () => {
  const user = userEvent.setup();
  const state = makeState({ participantAccess: false });
  mockApi(state, "admin");
  const opened = { ...state.settings, participantAccess: true };
  routes["/api/admin/participants/open"] = opened;
  renderPage(<Admin />);
  const open = await screen.findByRole("button", { name: "Open access" });
  routes["/api/state"] = { ...state, settings: opened };
  await user.click(open);
  expect(await screen.findByRole("button", { name: "Close access" })).toBeTruthy();
  expect(calls.some((call) => call.method === "POST" && call.path === "/api/admin/participants/open")).toBe(true);
});

it("participant page opens only the signed-in team's workspace", async () => {
  const user = userEvent.setup();
  mockApi(makeState(), "participant");
  renderPage(<Participant />);

  expect(await screen.findByText("Your challenge")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Team Alpha · Sign out" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Switch/ })).toBeNull();
  expect(screen.queryByText("Team Bravo")).toBeNull();
  expect(screen.getByRole("note").textContent).toContain("a guide, not a rule");
  expect(screen.getByText("1 of 2 complete")).toBeTruthy();
  // Hints guide the open steps only, and organizer text renders its emphasis.
  expect(screen.queryByText(/has the problem/)).toBeNull();
  expect(screen.getByText("one flow").tagName).toBe("STRONG");
  expect(screen.getByText("Length:").tagName).toBe("STRONG");
  expect(screen.getByText("Demo").tagName).toBe("LI");
  expect(await screen.findByText("Prompt library")).toBeTruthy();
  expect(screen.getByText("Resources from the organizers")).toBeTruthy();
  expect(screen.getByText("Slide 1 - Title")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Copy template" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Open link" }).getAttribute("href")).toBe("https://example.com/deck");
  expect(screen.getByText("Toolbox")).toBeTruthy();
  const google = screen.getByText("Start here: Google tools").closest("div.overflow-hidden")!;
  expect(google.textContent).toContain("Gemini");
  expect(google.textContent).not.toContain("Thinking partner.");
  expect(screen.getByText("More tools")).toBeTruthy();
  expect(screen.getByText("Pitch timer")).toBeTruthy();
  expect(screen.getByText("Backup uploads")).toBeTruthy();

  routes["/api/participant/teams/1"] = { id: 1, name: "Team Alpha", projectTitle: "Flood Watch", members: ["Ann", "Bo"], topicIds: [2], progress: [0, 1], sort: 1 };
  await user.click(screen.getByRole("checkbox", { name: /Build the prototype/ }));
  expect(await screen.findByText("2 of 2 complete")).toBeTruthy();
  expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ progress: [0, 1] });

  // Each goal explains itself on hover, and the section links out to the UN's goal pages.
  expect(screen.getByRole("link", { name: "About the SGDs" }).getAttribute("href")).toBe("https://sdgs.un.org/goals");
  await user.hover(screen.getByRole("button", { name: "SGD 1: No Poverty" }));
  expect((await screen.findByRole("tooltip")).textContent).toContain("End poverty.");
  await user.unhover(screen.getByRole("button", { name: "SGD 1: No Poverty" }));

  // A team can build on more than one goal.
  expect(screen.getByRole("button", { name: "SGD 4: Quality Education" }).getAttribute("aria-pressed")).toBe("true");
  routes["/api/participant/teams/1"] = { id: 1, name: "Team Alpha", projectTitle: "Flood Watch", members: ["Ann", "Bo"], topicIds: [2, 1], progress: [0, 1], sort: 1 };
  await user.click(screen.getByRole("button", { name: "SGD 1: No Poverty" }));
  expect(await screen.findByText("2 of 2 goals chosen")).toBeTruthy();
  expect(calls.filter((call) => call.method === "PUT").at(-1)?.body).toEqual({ topicIds: [2, 1] });

  // The team names its project at the top of the workspace and can rename it.
  const title = screen.getByLabelText("Project title") as HTMLInputElement;
  expect(title.value).toBe("Flood Watch");
  routes["/api/participant/teams/1"] = { id: 1, name: "Team Alpha", projectTitle: "Flood Radar", members: ["Ann", "Bo"], topicIds: [2, 1], progress: [0, 1], sort: 1 };
  await user.clear(title);
  await user.type(title, "Flood Radar{Enter}");
  expect(calls.filter((call) => call.method === "PUT").at(-1)?.body).toEqual({ projectTitle: "Flood Radar" });
  await waitFor(() => expect(title.value).toBe("Flood Radar"));
});

it("admin can open any team's workspace from the participant page", async () => {
  const user = userEvent.setup();
  mockApi(makeState(), "admin");
  renderPage(<Participant />);
  await user.click(await screen.findByRole("button", { name: /Team Bravo/ }));
  expect(await screen.findByRole("button", { name: "Team Bravo · Switch" })).toBeTruthy();
});

it("privacy page states the purpose, the safeguards, and the deletion after the event", async () => {
  mockApi(makeState(), null);
  renderPage(<Privacy />);
  expect(await screen.findByRole("heading", { name: "Privacy policy" })).toBeTruthy();
  expect(screen.getByText(/sole purpose of running this hackathon/)).toBeTruthy();
  expect(screen.getByText("How it is kept secure")).toBeTruthy();
  expect(screen.getByText(/organizers delete all member names/)).toBeTruthy();
  expect(screen.getByRole("link", { name: "Privacy policy" }).getAttribute("href")).toBe("/privacy");
  expect(screen.getByRole("link", { name: "davao@devcon.ph" }).getAttribute("href")).toBe("mailto:davao@devcon.ph");
});

it("admin deletes participant data only after confirming", async () => {
  const user = userEvent.setup();
  mockApi(makeState(), "admin");
  routes["/api/admin/participant-data"] = { ok: true };
  renderPage(<Admin />);
  await user.click(await screen.findByRole("button", { name: "Delete participant data" }));
  expect(calls.some((call) => call.method === "DELETE")).toBe(false);
  await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete participant data" }));
  await waitFor(() =>
    expect(calls.some((call) => call.method === "DELETE" && call.path === "/api/admin/participant-data")).toBe(true),
  );
});

it("admin reviews every score before publishing results", async () => {
  const user = userEvent.setup();
  const state = makeState({ voteEndsAt: Date.now() - 1000 });
  mockApi(state, "admin");
  const data = routes["/api/admin/data"] as { judgeScores: unknown[] };
  routes["/api/admin/voting/publish"] = { ...state.settings, resultsPublished: true };
  renderPage(<Admin />);

  // A missing score blocks the confirmation.
  await screen.findByText(/1 score is missing/);
  await user.click(screen.getByRole("button", { name: "Publish results" }));
  let dialog = within(await screen.findByRole("alertdialog"));
  expect(dialog.getByText(/Every judge has to score every team first/)).toBeTruthy();
  expect((dialog.getByRole("button", { name: "Publish results" }) as HTMLButtonElement).disabled).toBe(true);
  await user.click(dialog.getByRole("button", { name: "Cancel" }));

  cleanup();
  data.judgeScores.push({ judgeId: 2, teamId: 2, pitch: 20, demo: 30, impact: 30 });
  renderPage(<Admin />);
  await screen.findByText("Every judge has scored every team.");
  await user.click(screen.getByRole("button", { name: "Publish results" }));
  dialog = within(await screen.findByRole("alertdialog"));
  const rows = dialog.getAllByRole("row").map((row) => row.textContent);
  expect(rows[1]).toContain("1. Team Bravo");
  expect(rows[1]).toContain("22 + 36 + 32");
  expect(rows[1]).toContain("20 + 30 + 30");
  expect(rows[1]).toContain("4.257 votes");
  expect(rows[1]).toContain("85.0");
  expect(rows[2]).toContain("2. Team Alpha");
  expect(calls.some((call) => call.method === "POST")).toBe(false);

  await user.click(dialog.getByRole("button", { name: "Publish results" }));
  await waitFor(() =>
    expect(calls.some((call) => call.method === "POST" && call.path === "/api/admin/voting/publish")).toBe(true),
  );
});

it("admin page shows controls and every tab renders", async () => {
  const user = userEvent.setup();
  mockApi(makeState({ voteEndsAt: Date.now() - 1000 }), "admin");
  renderPage(<Admin />);
  expect(await screen.findByText("Hackathon timer")).toBeTruthy();
  expect(await screen.findByText("85.0 / 100")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Publish results" })).toBeTruthy();
  expect(screen.getByText("22 + 36 + 32")).toBeTruthy();
  expect(screen.getByText(/1 score is missing/)).toBeTruthy();

  await user.click(screen.getByRole("tab", { name: "Teams" }));
  expect(await screen.findByRole("button", { name: "Add team" })).toBeTruthy();
  expect(screen.getByText("pw-1")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Add team" }));
  expect(await screen.findByLabelText("Team name")).toBeTruthy();
  await user.keyboard("{Escape}");

  for (const [tab, text] of [
    ["Judges", "Only the judges listed here can sign in at /judge, by typing their username. Removing a judge deletes their scores."],
    ["Topics", "Quality Education"],
    ["Schedule", "Kickoff"],
    ["Resources & prompts", "Pitch deck template"],
    ["Uploads", "deck.pdf"],
  ]) {
    await user.click(screen.getByRole("tab", { name: tab }));
    expect(await screen.findByText(text)).toBeTruthy();
  }

  await user.click(screen.getByRole("tab", { name: "Settings" }));
  expect(((await screen.findByLabelText("Event name")) as HTMLInputElement).value).toBe("Test Hack");
});
