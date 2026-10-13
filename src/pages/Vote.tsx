import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FullPageMessage, PageShell, RESULTS_NOTE, ResultsList, Section } from "@/components/event";
import { api, errorMessage, formatDuration, useEventState, useNow } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getPhase } from "../../shared/types";

const RATINGS = [1, 2, 3, 4, 5];

export default function Vote() {
  const queryClient = useQueryClient();
  const { data: state } = useEventState(2000);
  const now = useNow(state?.clockOffset ?? 0);
  const status = useQuery({
    queryKey: ["vote-status"],
    queryFn: () => api<{ hasVoted: boolean }>("/api/vote/status"),
    // Polled so the form comes back if the admin resets voting.
    refetchInterval: 5000,
  });
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const submit = useMutation({
    mutationFn: () => api("/api/vote", { method: "POST", body: { ratings } }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["vote-status"] });
      queryClient.invalidateQueries({ queryKey: ["state"] });
    },
  });

  if (!state || !status.data) return <FullPageMessage>Loading…</FullPageMessage>;

  const { settings, teams } = state;
  const phase = getPhase(settings, now);
  const hasVoted = status.data.hasVoted;
  const ratedCount = teams.filter((team) => ratings[team.id] !== undefined).length;
  const open = phase === "voting";
  const registered = `${state.ballotCount} ${state.ballotCount === 1 ? "vote" : "votes"} registered`;

  return (
    <PageShell state={state} now={now}>
      {phase === "results" && state.results ? (
        <Section title="Results" description={`${RESULTS_NOTE} · ${registered}`}>
          <ResultsList teams={teams} results={state.results} />
        </Section>
      ) : settings.voteEndsAt === null ? (
        <Section title="Voting has not opened yet" description="Keep this page open. It will unlock when voting starts.">
          <p className="text-sm text-muted-foreground">You will rate each team's pitch and demo from 1 to 5.</p>
        </Section>
      ) : hasVoted ? (
        <Section title="Thanks, your vote is in" description={registered}>
          <p className="text-sm text-muted-foreground">
            {open ? `Voting closes in ${formatDuration(settings.voteEndsAt - now)}.` : "Voting is closed. Results will be announced shortly."}
          </p>
        </Section>
      ) : (
        <Section
          title="Rate each team's pitch and demo"
          description="1 is the lowest, 5 is the highest. Rate every team, then submit. You can vote once."
          action={
            <div className={cn("font-mono text-2xl font-semibold tabular-nums", !open && "text-destructive")}>
              {open ? formatDuration(settings.voteEndsAt - now) : "Closed"}
            </div>
          }
        >
          <div className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => (
                <fieldset key={team.id} className="flex flex-col gap-2">
                  <legend className="mb-2 flex flex-col">
                    <span className="font-medium">{team.name}</span>
                    {team.projectTitle && <span className="text-sm text-muted-foreground">{team.projectTitle}</span>}
                  </legend>
                  <div className="grid grid-cols-5 gap-2">
                    {RATINGS.map((value) => (
                      <Button
                        key={value}
                        type="button"
                        size="lg"
                        disabled={!open}
                        variant={ratings[team.id] === value ? "default" : "outline"}
                        aria-pressed={ratings[team.id] === value}
                        aria-label={`Rate ${team.name} ${value} out of 5`}
                        onClick={() => setRatings((current) => ({ ...current, [team.id]: value }))}
                      >
                        {value}
                      </Button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {ratedCount} of {teams.length} rated
                </span>
                <span>{registered}</span>
              </div>
              {submit.isError && <p className="text-sm text-destructive">{errorMessage(submit.error)}</p>}
              <Button
                size="lg"
                disabled={!open || ratedCount < teams.length || submit.isPending}
                onClick={() => submit.mutate()}
              >
                {open ? "Submit vote" : "Voting is closed"}
              </Button>
            </div>
          </div>
        </Section>
      )}
    </PageShell>
  );
}
