import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import { RichText } from "@/components/RichText";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDuration, type ClientState } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  AUDIENCE_MAX_RATING,
  AUDIENCE_WEIGHT,
  JUDGE_MAX_SCORE,
  JUDGE_WEIGHT,
  getPhase,
  type Phase,
  type PublicSettings,
  type ScheduleItem,
  type Team,
  type TeamResult,
  type Topic,
} from "../../shared/types";

const PHASE_LABELS: Record<Phase, string> = {
  upcoming: "Starting soon",
  hacking: "Hacking in progress",
  paused: "Timer paused",
  pitching: "Time's up · Pitches",
  voting: "Voting is live",
  voting_closed: "Voting closed",
  results: "Results are in",
};

// Temporary low-resolution export. Swap the file for the final SUBAY artwork.
const SUBAY_LOGO = "/assets/subaylogo.png";

/** The event wordmark. It is white, so it needs `bg-subay` or another saturated surface behind it. */
export function EventLogo({ name, className }: { name: string; className?: string }) {
  return <img src={SUBAY_LOGO} alt={name} className={cn("drop-shadow-[0_0_24px_rgb(255_255_255/0.45)]", className)} />;
}

export function sgdLabel(topic: Topic): string {
  return `SGD ${topic.sort}: ${topic.title}`;
}

export const SGD_URL = "https://sdgs.un.org/goals";

/** Spells a goal out on hover or focus. Needs the provider that `PageShell` sets up. */
export function SgdTooltip({ topic, children }: { topic: Topic; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="flex-col items-start gap-0.5 text-left text-sm">
        <span className="font-semibold">{sgdLabel(topic)}</span>
        {topic.description && <span>{topic.description}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

/** A goal's number on its own color, for places too tight to spell the goal out. */
export function SgdChip({ topic }: { topic: Topic }) {
  return (
    <SgdTooltip topic={topic}>
      <span
        role="img"
        aria-label={sgdLabel(topic)}
        tabIndex={0}
        className="inline-flex size-6 items-center justify-center rounded-md text-xs font-bold text-white"
        style={{ backgroundColor: topic.color || "var(--primary)" }}
      >
        {topic.sort}
      </span>
    </SgdTooltip>
  );
}

export function PhaseBadge({ phase }: { phase: Phase }) {
  const live = phase === "hacking" || phase === "voting";
  return (
    <Badge variant={live ? "default" : "secondary"} className="gap-1.5">
      {live && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {PHASE_LABELS[phase]}
    </Badge>
  );
}

export function PageShell({
  state,
  now,
  actions,
  children,
}: {
  state: ClientState;
  now: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-3 px-4 py-2">
            <Link to="/" className="flex items-center gap-2 font-heading text-lg font-semibold">
              <img src="/assets/devcon-icon.svg" alt="" className="size-6" />
              {state.settings.eventName}
            </Link>
            <PhaseBadge phase={getPhase(state.settings, now)} />
            <nav className="ml-auto flex items-center gap-1 text-sm">
              {actions}
              <NavLink to="/">Live</NavLink>
              <NavLink to="/participant">Participants</NavLink>
              <NavLink to="/vote">Vote</NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-4 p-4">{children}</main>
        {/* The partner logos are white, so the footer stays dark in both themes. */}
        <footer className="bg-brand-950">
          <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-center gap-x-10 gap-y-2 px-4 py-2 text-xs tracking-widest text-brand-200 uppercase">
            <span className="flex items-center gap-3">
              Hosted by
              <a href="https://devcon.ph" target="_blank" rel="noreferrer">
                <img src="/assets/devcondavao.svg" alt="DEVCON Davao" className="h-14 w-auto" />
              </a>
            </span>
            <span className="flex items-center gap-3">
              A program of
              <img src="/assets/sheisdevconlogo.png" alt="She is DEVCON" className="h-7 w-auto" />
            </span>
            <Link to="/privacy" className="underline-offset-4 hover:underline">
              Privacy policy
            </Link>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
      {children}
    </Link>
  );
}

export function hackRemainingMs(settings: PublicSettings, now: number): number {
  if (settings.hackPausedRemainingMs !== null) return settings.hackPausedRemainingMs;
  if (settings.hackEndsAt !== null) return Math.max(0, settings.hackEndsAt - now);
  return settings.hackDurationMin * 60_000;
}

export function HackTimer({ settings, now, className }: { settings: PublicSettings; now: number; className?: string }) {
  const remaining = hackRemainingMs(settings, now);
  const ended = settings.hackEndsAt !== null && remaining === 0;
  return (
    <div className={cn("font-mono font-semibold tabular-nums", ended && "text-destructive", className)}>
      {formatDuration(remaining)}
    </div>
  );
}

export function voteUrl(): string {
  return `${window.location.origin}/vote`;
}

export function VoteQr({ size = 180 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-lg bg-white p-3">
        <QRCodeSVG value={voteUrl()} size={size} />
      </div>
      <a href="/vote" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        {voteUrl()}
      </a>
    </div>
  );
}

export function ScheduleList({ schedule }: { schedule: ScheduleItem[] }) {
  if (schedule.length === 0) return <p className="text-sm text-muted-foreground">The schedule has not been posted yet.</p>;
  return (
    <ol className="flex flex-col">
      {schedule.map((item) => (
        <li key={item.id} className="flex gap-4 border-b py-2 first:pt-0 last:border-0 last:pb-0">
          <span className="w-24 shrink-0 font-mono text-sm text-muted-foreground">{item.timeLabel}</span>
          <div>
            <p className="font-medium">{item.title}</p>
            {item.description && <RichText text={item.description} className="text-sm text-muted-foreground" />}
          </div>
        </li>
      ))}
    </ol>
  );
}

export const RESULTS_NOTE = `${JUDGE_WEIGHT * 100}% judges, ${AUDIENCE_WEIGHT * 100}% audience vote`;

export function ResultsList({ teams, results }: { teams: Team[]; results: TeamResult[] }) {
  const rows = teams
    .map((team) => ({ team, result: results.find((entry) => entry.teamId === team.id) }))
    .sort((a, b) => (b.result?.final ?? 0) - (a.result?.final ?? 0));
  return (
    <ol className="flex flex-col gap-3">
      {rows.map(({ team, result }, index) => (
        <li key={team.id} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className={cn("font-medium", index === 0 && result && "text-lg")}>
              {index + 1}. {team.name}
            </span>
            <span className="font-mono text-sm tabular-nums">{(result?.final ?? 0).toFixed(1)} / 100</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${result?.final ?? 0}%` }} />
          </div>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            Judges {result?.judgeAverage == null ? "no scores" : `${result.judgeAverage.toFixed(1)} / ${JUDGE_MAX_SCORE}`}
            {" · "}
            Audience{" "}
            {result?.audienceAverage == null
              ? "no ratings"
              : `${result.audienceAverage.toFixed(2)} / ${AUDIENCE_MAX_RATING} (${result.audienceCount} ${result.audienceCount === 1 ? "vote" : "votes"})`}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function Section({
  title,
  description,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function FullPageMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh items-center justify-center p-6 text-muted-foreground">{children}</div>;
}
