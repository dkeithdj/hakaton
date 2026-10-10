import { QRCodeSVG } from "qrcode.react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, type ClientState } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getPhase, type Phase, type PublicSettings, type ScheduleItem, type Team, type TeamResult } from "../../shared/types";

const PHASE_LABELS: Record<Phase, string> = {
  upcoming: "Starting soon",
  hacking: "Hacking in progress",
  paused: "Timer paused",
  pitching: "Time's up · Pitches",
  voting: "Voting is live",
  voting_closed: "Voting closed",
  results: "Results are in",
};

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
    <div className="min-h-svh">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="font-heading text-lg font-semibold">
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
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">{children}</main>
    </div>
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
        <li key={item.id} className="flex gap-4 border-b py-3 last:border-0">
          <span className="w-24 shrink-0 font-mono text-sm text-muted-foreground">{item.timeLabel}</span>
          <div>
            <p className="font-medium">{item.title}</p>
            {item.description && <p className="text-sm whitespace-pre-line text-muted-foreground">{item.description}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function ResultsList({ teams, results }: { teams: Team[]; results: TeamResult[] }) {
  const rows = teams
    .map((team) => ({ team, result: results.find((entry) => entry.teamId === team.id) }))
    .sort((a, b) => (b.result?.average ?? 0) - (a.result?.average ?? 0));
  return (
    <ol className="flex flex-col gap-3">
      {rows.map(({ team, result }, index) => (
        <li key={team.id} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className={cn("font-medium", index === 0 && result && "text-lg")}>
              {index + 1}. {team.name}
            </span>
            <span className="font-mono text-sm tabular-nums">
              {result ? `${result.average.toFixed(2)} / 5` : "no ratings"}
              <span className="ml-2 text-muted-foreground">{result?.count ?? 0} votes</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${((result?.average ?? 0) / 5) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
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
