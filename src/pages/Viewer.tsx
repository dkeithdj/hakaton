import { QRCodeSVG } from "qrcode.react";
import { Progress } from "@/components/ui/progress";
import {
  EventLogo,
  FullPageMessage,
  HackTimer,
  PageShell,
  RESULTS_NOTE,
  ResultsList,
  ScheduleList,
  Section,
  SgdChip,
  voteUrl,
} from "@/components/event";
import { formatDuration, useEventState, useNow, type ClientState } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getPhase } from "../../shared/types";

export default function Viewer() {
  const { data: state } = useEventState(5000);
  const now = useNow(state?.clockOffset ?? 0);
  if (!state) return <FullPageMessage>Loading…</FullPageMessage>;

  const { settings, teams, topics, schedule } = state;
  const phase = getPhase(settings, now);
  const voting = phase === "voting";

  if (voting || phase === "voting_closed") {
    return (
      <PageShell state={state} now={now}>
        <VotingScreen state={state} now={now} open={voting} />
      </PageShell>
    );
  }

  return (
    <PageShell state={state} now={now}>
      <section className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 rounded-3xl bg-subay px-6 py-5 text-white sm:justify-between">
        <div className="flex flex-col items-center gap-1 sm:items-start">
          <h1>
            <EventLogo name={settings.eventName} className="w-full max-w-64" />
          </h1>
          {settings.tagline && <p className="text-lg text-white/85">{settings.tagline}</p>}
        </div>
        <div className="flex flex-col items-center gap-1 sm:items-end">
          <p className="text-sm tracking-widest text-white/85 uppercase">
            {phase === "upcoming" ? "Hackathon duration" : "Time remaining"}
          </p>
          <HackTimer settings={settings} now={now} className="text-6xl leading-none text-white sm:text-7xl" />
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          {state.results && (
            <Section title="Results" description={`${RESULTS_NOTE} · ${state.ballotCount} votes`}>
              <ResultsList teams={teams} results={state.results} />
            </Section>
          )}

          <Section title="Program flow">
            <ScheduleList schedule={schedule} />
          </Section>
        </div>

        <Section
          title="Teams"
          description="The goals each team is building on and how far along they are."
          className="lg:col-span-2"
        >
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">Teams have not been announced yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => {
                const chosen = topics.filter((topic) => team.topicIds.includes(topic.id));
                const total = settings.milestones.length;
                const done = team.progress.filter((index) => index < total).length;
                return (
                  <div key={team.id} className="flex flex-col gap-1.5 rounded-lg border p-3">
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-muted-foreground">{team.members.join(", ") || "No members listed"}</p>
                    {chosen.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {chosen.map((topic) => (
                          <SgdChip key={topic.id} topic={topic} />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No SGD chosen yet</p>
                    )}
                    {total > 0 && (
                      <div className="flex items-center gap-3">
                        <Progress value={(done / total) * 100} />
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {done}/{total}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </PageShell>
  );
}

/** Laid out for a projector: QR, countdown, and vote count readable from the back of the room. */
function VotingScreen({ state, now, open }: { state: ClientState; now: number; open: boolean }) {
  const { settings, ballotCount } = state;
  const remaining = settings.voteEndsAt! - now;
  return (
    <section className="grid min-h-[calc(100svh-8rem)] items-center gap-8 lg:grid-cols-2">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-heading text-3xl font-semibold sm:text-5xl">
          {open ? "Scan to vote" : "Voting is closed"}
        </h1>
        <div className={cn("w-full max-w-[min(60svh,34rem)] rounded-2xl bg-white p-5", !open && "opacity-20")}>
          <QRCodeSVG value={voteUrl()} size={512} className="h-auto w-full" />
        </div>
        <p className="font-mono text-xl break-all sm:text-2xl">{voteUrl().replace(/^https?:\/\//, "")}</p>
      </div>

      <div className="flex flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg tracking-widest text-muted-foreground uppercase sm:text-2xl">
            {open ? "Voting closes in" : "Time's up"}
          </p>
          <div
            className={cn(
              "font-mono text-8xl leading-none font-semibold tabular-nums sm:text-9xl",
              (!open || remaining <= 15_000) && "text-destructive",
            )}
          >
            {formatDuration(remaining)}
          </div>
        </div>

        <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-3xl bg-subay px-8 py-8 text-white">
          {/* Re-keyed on every change so the number pops when a vote lands. */}
          <div
            key={ballotCount}
            className="animate-in font-mono text-[9rem] leading-none font-bold tabular-nums duration-300 zoom-in-125 sm:text-[12rem]"
          >
            {ballotCount}
          </div>
          <p className="text-2xl font-medium tracking-widest uppercase sm:text-3xl">
            {ballotCount === 1 ? "vote registered" : "votes registered"}
          </p>
        </div>

        <p className="text-lg text-muted-foreground sm:text-xl">
          {open ? "Rate every team's pitch and demo from 1 to 5." : "Results will be announced shortly."}
        </p>
      </div>
    </section>
  );
}
