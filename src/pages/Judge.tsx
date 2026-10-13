import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { FullPageMessage, PageShell, RESULTS_NOTE, Section } from "@/components/event";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, errorMessage, useEventState, useNow, type ClientState } from "@/lib/api";
import {
  JUDGE_CRITERIA,
  JUDGE_MAX_SCORE,
  type CriteriaScores,
  type Judge as JudgeIdentity,
  type JudgeCriterion,
  type JudgeSession,
  type Team,
} from "../../shared/types";

export default function Judge() {
  const { data: state } = useEventState(5000);
  const session = useQuery({
    queryKey: ["judge"],
    queryFn: () => api<JudgeSession>("/api/judge"),
  });
  if (!state || !session.data) return <FullPageMessage>Loading…</FullPageMessage>;
  if (!session.data.judge) return <JudgeLogin eventName={state.settings.eventName} />;
  return <Scoresheet state={state} judge={session.data.judge} saved={session.data.scores} />;
}

function JudgeLogin({ eventName }: { eventName: string }) {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const login = useMutation({
    mutationFn: () => api<JudgeSession>("/api/judge/login", { method: "POST", body: { username } }),
    onSuccess: (session) => queryClient.setQueryData(["judge"], session),
  });

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{eventName} · Judges</CardTitle>
          <CardDescription>
            Enter the username the organizers gave you. Your scores will be there whenever you come back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              login.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoFocus
                maxLength={50}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            {login.isError && <p className="text-sm text-destructive">{errorMessage(login.error)}</p>}
            <Button type="submit" disabled={login.isPending || username.trim() === ""}>
              Enter
            </Button>
            <Link to="/privacy" className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline">
              Privacy policy
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

type Draft = Record<JudgeCriterion, string>;
type Saved = Record<number, CriteriaScores>;

function toDraft(saved: CriteriaScores | undefined): Draft {
  return Object.fromEntries(
    JUDGE_CRITERIA.map(({ key }) => [key, saved === undefined ? "" : String(saved[key])]),
  ) as Draft;
}

function toDrafts(teams: Team[], saved: Saved): Record<number, Draft> {
  return Object.fromEntries(teams.map((team) => [team.id, toDraft(saved[team.id])]));
}

function isBlank(draft: Draft): boolean {
  return JUDGE_CRITERIA.every(({ key }) => draft[key].trim() === "");
}

function isValidPoints(value: string, max: number): boolean {
  const points = Number(value);
  return value.trim() !== "" && Number.isFinite(points) && points >= 0 && points <= max;
}

/** A team is either left empty or scored on every criterion. */
function isValid(draft: Draft): boolean {
  return isBlank(draft) || JUDGE_CRITERIA.every(({ key, max }) => isValidPoints(draft[key], max));
}

function Scoresheet({ state, judge, saved }: { state: ClientState; judge: JudgeIdentity; saved: Saved }) {
  const queryClient = useQueryClient();
  const now = useNow(state.clockOffset);
  const { teams, settings } = state;
  const [drafts, setDrafts] = useState(() => toDrafts(teams, saved));
  // Teams added after the page loaded get empty boxes without disturbing what is being typed.
  useEffect(() => setDrafts((current) => ({ ...toDrafts(teams, saved), ...current })), [teams, saved]);
  const draftFor = (team: Team) => drafts[team.id] ?? toDraft(undefined);

  const logout = useMutation({
    mutationFn: () => api("/api/judge/logout", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["judge"] }),
  });
  const save = useMutation({
    mutationFn: () => {
      // A team left empty has its score cleared.
      const scores = Object.fromEntries(
        teams.map((team) => {
          const draft = draftFor(team);
          const points = Object.fromEntries(JUDGE_CRITERIA.map(({ key }) => [key, Number(draft[key])]));
          return [team.id, isBlank(draft) ? null : points];
        }),
      );
      return api<JudgeSession>("/api/judge/scores", { method: "PUT", body: { scores } });
    },
    onSuccess: (session) => {
      queryClient.setQueryData(["judge"], session);
      toast.success("Scores saved");
    },
    onError: (error) => {
      // The usual cause is an organizer removing this judge, so check whether the session is still there.
      queryClient.invalidateQueries({ queryKey: ["judge"] });
      toast.error(errorMessage(error));
    },
  });

  const locked = settings.resultsPublished;
  const scored = teams.filter((team) => saved[team.id] !== undefined).length;
  const dirty = teams.some((team) => {
    const draft = draftFor(team);
    const original = toDraft(saved[team.id]);
    return JUDGE_CRITERIA.some(({ key }) => draft[key].trim() !== original[key]);
  });
  const invalid = teams.some((team) => !isValid(draftFor(team)));

  return (
    <PageShell
      state={state}
      now={now}
      actions={
        <Button size="sm" variant="outline" onClick={() => logout.mutate()}>
          Sign out
        </Button>
      }
    >
      <Section
        title={`Judging as ${judge.name}`}
        description={
          locked
            ? "Results are published, so scores are locked."
            : `Score each team on ${JUDGE_CRITERIA.map(({ label, max }) => `${label.toLowerCase()} (${max})`).join(", ")}, ${JUDGE_MAX_SCORE} points in total. You can change a score any time until results are published. Final ranking: ${RESULTS_NOTE}.`
        }
      >
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">The organizers have not created teams yet.</p>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => {
                const draft = draftFor(team);
                const complete = !isBlank(draft) && isValid(draft);
                return (
                  <fieldset key={team.id} className="flex flex-col gap-2">
                    <legend className="mb-2 flex w-full items-baseline justify-between gap-3 font-medium">
                      <span className="flex min-w-0 flex-col">
                        {team.name}
                        {team.projectTitle && (
                          <span className="text-sm font-normal text-muted-foreground">{team.projectTitle}</span>
                        )}
                      </span>
                      <span className="shrink-0 font-mono text-sm text-muted-foreground tabular-nums">
                        {complete ? JUDGE_CRITERIA.reduce((total, { key }) => total + Number(draft[key]), 0) : "–"} /{" "}
                        {JUDGE_MAX_SCORE}
                      </span>
                    </legend>
                    <div className="grid grid-cols-3 gap-2">
                      {JUDGE_CRITERIA.map(({ key, label, max }) => (
                        <div key={key} className="flex flex-col gap-1">
                          <Label htmlFor={`score-${team.id}-${key}`} className="text-xs text-muted-foreground">
                            {label} / {max}
                          </Label>
                          <Input
                            id={`score-${team.id}-${key}`}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={max}
                            step="any"
                            disabled={locked}
                            aria-label={`${team.name} ${label.toLowerCase()} out of ${max}`}
                            aria-invalid={!isBlank(draft) && !isValidPoints(draft[key], max)}
                            value={draft[key]}
                            onChange={(event) =>
                              setDrafts((current) => ({ ...current, [team.id]: { ...draft, [key]: event.target.value } }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {scored} of {teams.length} scored{dirty && " · unsaved changes"}
              </p>
              {invalid && (
                <p className="text-sm text-destructive">
                  Fill in every criterion for a team, within its maximum, or leave that team empty.
                </p>
              )}
              <Button type="submit" size="lg" disabled={locked || !dirty || invalid || save.isPending}>
                Save scores
              </Button>
            </div>
          </form>
        )}
      </Section>
    </PageShell>
  );
}
