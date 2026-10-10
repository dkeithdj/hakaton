import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Admin from "@/pages/Admin";
import Participant from "@/pages/Participant";
import Viewer from "@/pages/Viewer";
import Vote from "@/pages/Vote";
import type { EventState, PublicSettings, Role } from "../shared/types";

const baseSettings: PublicSettings = {
  eventName: "Test Hack",
  tagline: "Tagline",
  guidelines: "Five minutes total.",
  milestones: [
    { title: "Define the problem", minutes: 45 },
    { title: "Build the prototype", minutes: 90 },
  ],
  hackDurationMin: 180,
  voteDurationSec: 120,
  hackEndsAt: null,
  hackPausedRemainingMs: null,
  voteEndsAt: null,
  resultsPublished: false,
};

function makeState(settings: Partial<PublicSettings> = {}, extra: Partial<EventState> = {}): EventState {
  return {
    serverNow: Date.now(),
    settings: { ...baseSettings, ...settings },
    teams: [
      { id: 1, name: "Team Alpha", members: ["Ann", "Bo"], topicId: 1, progress: [0], sort: 1 },
      { id: 2, name: "Team Bravo", members: ["Cy"], topicId: null, progress: [], sort: 2 },
    ],
    topics: [{ id: 1, title: "AI for education", description: "Help teachers.", sort: 1 }],
    schedule: [{ id: 1, timeLabel: "1:00 PM", title: "Kickoff", description: "", sort: 1 }],
    ballotCount: 7,
    results: null,
    ...extra,
  };
}

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
      tools: [{ id: 1, name: "Claude", description: "Thinking partner.", url: "https://claude.ai", sort: 1 }],
    },
    "/api/participant/uploads": [],
    "/api/admin/data": {
      settings: state.settings,
      teams: state.teams.map((team) => ({ ...team, password: `pw-${team.id}` })),
      materials: [{ id: 1, title: "Pitch deck template", description: "", url: "", body: "Slide 1 - Title", sort: 1 }],
      prompts: [],
      tools: [],
      uploads: [{ id: 1, teamId: 1, kind: "deck", filename: "deck.pdf", size: 2_000_000, createdAt: Date.now() }],
      results: [
        { teamId: 1, average: 3.5, count: 7 },
        { teamId: 2, average: 4.25, count: 7 },
      ],
    },
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
  expect(screen.getByText("03:00:00")).toBeTruthy();
  expect(screen.getByText("Kickoff")).toBeTruthy();
  expect(screen.getByText("Team Alpha")).toBeTruthy();
  expect(screen.getByText("1/2")).toBeTruthy();
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
  const results = [
    { teamId: 1, average: 3.5, count: 7 },
    { teamId: 2, average: 4.25, count: 7 },
  ];
  mockApi(makeState({ voteEndsAt: Date.now() - 1000, resultsPublished: true }, { results }), null);
  renderPage(<Viewer />);
  expect(await screen.findByText("1. Team Bravo")).toBeTruthy();
  expect(screen.getByText("4.25 / 5")).toBeTruthy();
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

it("participant page asks for a team and its password when signed out", async () => {
  mockApi(makeState(), null);
  renderPage(<Participant />);
  expect(await screen.findByLabelText("Team password")).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Team" })).toBeTruthy();
  expect((screen.getByRole("button", { name: "Enter" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByText("Your challenge")).toBeNull();
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
  expect(await screen.findByText("Prompt library")).toBeTruthy();
  expect(screen.getByText("Resources from the organizers")).toBeTruthy();
  expect(screen.getByText("Slide 1 - Title")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Copy template" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Open link" }).getAttribute("href")).toBe("https://example.com/deck");
  expect(screen.getByText("Toolbox")).toBeTruthy();
  expect(screen.getByText("Pitch timer")).toBeTruthy();
  expect(screen.getByText("Backup uploads")).toBeTruthy();

  routes["/api/participant/teams/1"] = { id: 1, name: "Team Alpha", members: ["Ann", "Bo"], topicId: 1, progress: [0, 1], sort: 1 };
  await user.click(screen.getByRole("checkbox", { name: /Build the prototype/ }));
  expect(await screen.findByText("2 of 2 complete")).toBeTruthy();
  expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ progress: [0, 1] });
});

it("admin can open any team's workspace from the participant page", async () => {
  const user = userEvent.setup();
  mockApi(makeState(), "admin");
  renderPage(<Participant />);
  await user.click(await screen.findByRole("button", { name: /Team Bravo/ }));
  expect(await screen.findByRole("button", { name: "Team Bravo · Switch" })).toBeTruthy();
});

it("admin page shows controls and every tab renders", async () => {
  const user = userEvent.setup();
  mockApi(makeState({ voteEndsAt: Date.now() - 1000 }), "admin");
  renderPage(<Admin />);
  expect(await screen.findByText("Hackathon timer")).toBeTruthy();
  expect(await screen.findByText("4.25 / 5")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Publish results" })).toBeTruthy();

  await user.click(screen.getByRole("tab", { name: "Teams" }));
  expect(await screen.findByRole("button", { name: "Add team" })).toBeTruthy();
  expect(screen.getByText("pw-1")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Add team" }));
  expect(await screen.findByLabelText("Team name")).toBeTruthy();
  await user.keyboard("{Escape}");

  for (const [tab, text] of [
    ["Topics", "AI for education"],
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
