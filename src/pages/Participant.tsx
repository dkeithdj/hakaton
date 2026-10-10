import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ChevronDownIcon, CopyIcon, ExternalLinkIcon, LightbulbIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FullPageMessage, HackTimer, PageShell, ScheduleList, Section, VoteQr } from "@/components/event";
import { LoginCard } from "@/components/LoginCard";
import { PitchTimer } from "@/components/PitchTimer";
import { TeamUploads } from "@/components/TeamUploads";
import { api, errorMessage, useEventState, useMe, useNow, type ClientState } from "@/lib/api";
import { getPhase, type Material, type Me, type Prompt, type Team, type Tool } from "../../shared/types";

const NO_TOPIC = "none";

export default function Participant() {
  const me = useMe();
  const { data: state } = useEventState(5000);
  if (me.isPending || !state) return <FullPageMessage>Loading…</FullPageMessage>;
  if (!me.data?.role) {
    return (
      <LoginCard
        role="participant"
        title={`${state.settings.eventName} · Participants`}
        description="Select your team and enter the team password from the organizers."
        teams={state.teams}
      />
    );
  }
  return <Workspace state={state} me={me.data} />;
}

function Workspace({ state, me }: { state: ClientState; me: Me }) {
  const queryClient = useQueryClient();
  const now = useNow(state.clockOffset);
  // Teams are locked to the one they signed in as. Only admins can browse between teams.
  const isAdmin = me.role === "admin";
  const [adminTeamId, setAdminTeamId] = useState<number | null>(null);
  const teamId = isAdmin ? adminTeamId : me.teamId;
  const [picking, setPicking] = useState(false);
  const content = useQuery({
    queryKey: ["participant-content"],
    queryFn: () => api<{ materials: Material[]; prompts: Prompt[]; tools: Tool[] }>("/api/participant/content"),
  });

  const { settings, teams, topics } = state;
  const team = teams.find((entry) => entry.id === teamId) ?? null;
  const phase = getPhase(settings, now);

  const updateTeam = useMutation({
    mutationFn: (patch: Partial<Pick<Team, "topicId" | "progress">>) =>
      api<Team>(`/api/participant/teams/${team!.id}`, { method: "PUT", body: patch }),
    onSuccess: (updated) => {
      queryClient.setQueryData<ClientState>(["state"], (current) =>
        current && { ...current, teams: current.teams.map((entry) => (entry.id === updated.id ? updated : entry)) },
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  function chooseTeam(id: number) {
    setAdminTeamId(id);
    setPicking(false);
  }

  const logout = useMutation({
    mutationFn: () => api("/api/logout", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const milestones = settings.milestones;
  const done = team ? team.progress.filter((index) => index < milestones.length) : [];

  return (
    <PageShell
      state={state}
      now={now}
      actions={
        isAdmin ? (
          team && (
            <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
              {team.name} · Switch
            </Button>
          )
        ) : (
          <Button size="sm" variant="outline" onClick={() => logout.mutate()}>
            {team ? `${team.name} · Sign out` : "Sign out"}
          </Button>
        )
      }
    >
      <Dialog open={isAdmin && (picking || !team)} onOpenChange={(open) => team && setPicking(open)}>
        <DialogContent showCloseButton={team !== null}>
          <DialogHeader>
            <DialogTitle>View a team</DialogTitle>
            <DialogDescription>You are signed in as admin, so you can open any team's workspace.</DialogDescription>
          </DialogHeader>
          {teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">The organizers have not created teams yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {teams.map((entry) => (
                <Button
                  key={entry.id}
                  variant={entry.id === teamId ? "default" : "outline"}
                  className="h-auto justify-start py-3 text-left"
                  onClick={() => chooseTeam(entry.id)}
                >
                  <span className="flex flex-col">
                    <span>{entry.name}</span>
                    <span className="text-xs font-normal opacity-70">{entry.members.join(", ")}</span>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <section className="flex flex-col items-center gap-2 py-4 text-center">
        <p className="text-sm tracking-widest text-muted-foreground uppercase">
          {phase === "upcoming" ? "Sprint duration" : "Sprint time remaining"}
        </p>
        <HackTimer settings={settings} now={now} className="text-6xl sm:text-7xl" />
      </section>

      {phase === "voting" && (
        <Section title="Voting is live!" description="Scan to rate every team's pitch and demo.">
          <VoteQr />
        </Section>
      )}

      <div
        role="note"
        className="flex gap-3 rounded-xl border-2 border-amber-500/60 bg-amber-500/10 p-4 text-amber-100"
      >
        <LightbulbIcon className="mt-0.5 size-5 shrink-0 text-amber-400" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Everything here is a guide, not a rule.</p>
          <p className="text-sm">
            The topics, prompts, and tools are starting points. Build on any topic and use whatever tools get your team
            to a working demo.
          </p>
        </div>
      </div>

      {team && (
        <Section title="Your challenge" description={team.members.join(", ") || undefined}>
          <div className="flex flex-col gap-3">
            <p className="text-lg font-medium">{team.name}</p>
            <Select
              value={team.topicId === null ? NO_TOPIC : String(team.topicId)}
              onValueChange={(value) => updateTeam.mutate({ topicId: value === NO_TOPIC ? null : Number(value) })}
            >
              <SelectTrigger className="w-full sm:w-96" aria-label="Topic">
                <SelectValue placeholder="Choose a topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TOPIC}>No topic chosen</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={String(topic.id)}>
                    {topic.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {topics.find((topic) => topic.id === team.topicId)?.description ||
                "Pick a topic as a starting point, or go with your own idea. You can change it any time."}
            </p>
          </div>
        </Section>
      )}

      {team && milestones.length > 0 && (
        <Section
          title="Progress checklist"
          description={`${done.length} of ${milestones.length} complete`}
          action={
            <Button size="sm" variant="ghost" disabled={done.length === 0} onClick={() => updateTeam.mutate({ progress: [] })}>
              Reset
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            <Progress value={(done.length / milestones.length) * 100} />
            {milestones.map((milestone, index) => (
              <label key={index} className="flex cursor-pointer items-center gap-3">
                <Checkbox
                  checked={done.includes(index)}
                  onCheckedChange={(checked) =>
                    updateTeam.mutate({
                      progress: checked ? [...done, index] : done.filter((entry) => entry !== index),
                    })
                  }
                />
                <span className={done.includes(index) ? "text-muted-foreground line-through" : undefined}>
                  {milestone.title}
                </span>
                {milestone.minutes > 0 && <Badge variant="secondary">{milestone.minutes} min</Badge>}
              </label>
            ))}
          </div>
        </Section>
      )}

      {settings.guidelines && (
        <Collapsible defaultOpen>
          <Section
            title="Presentation guidelines"
            action={
              <CollapsibleTrigger asChild>
                <Button size="icon-sm" variant="ghost" aria-label="Toggle guidelines">
                  <ChevronDownIcon />
                </Button>
              </CollapsibleTrigger>
            }
          >
            <CollapsibleContent>
              <p className="text-sm leading-relaxed whitespace-pre-line">{settings.guidelines}</p>
            </CollapsibleContent>
          </Section>
        </Collapsible>
      )}

      {content.data && content.data.materials.length > 0 && (
        <Section
          title="Resources from the organizers"
          description="Templates and links provided for this event. Copy a template into your AI tool of choice and adapt it."
        >
          <div className="flex flex-col gap-3">
            {content.data.materials.map((material) => (
              <MaterialCard key={material.id} material={material} />
            ))}
          </div>
        </Section>
      )}

      {content.data && content.data.prompts.length > 0 && (
        <Section
          title="Prompt library"
          description="Copy-ready prompts for each phase of the build. Optional. Paste them into any AI tool and adapt them."
        >
          <div className="flex flex-col gap-3">
            {content.data.prompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        </Section>
      )}

      {content.data && content.data.tools.length > 0 && (
        <Section title="Toolbox" description="Suggestions only. Most have a free tier. Use any tool you like.">
          <div className="grid gap-3 sm:grid-cols-2">
            {content.data.tools.map((tool) => (
              <a
                key={tool.id}
                href={tool.url || undefined}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-1 rounded-lg border p-4 hover:bg-muted/50"
              >
                <span className="flex items-center gap-2 font-medium">
                  {tool.name}
                  {tool.url && <ExternalLinkIcon className="size-3.5 text-muted-foreground" />}
                </span>
                <span className="text-sm text-muted-foreground">{tool.description}</span>
              </a>
            ))}
          </div>
        </Section>
      )}

      <Section title="Pitch timer" description="Rehearse against the clock. It beeps at zero.">
        <PitchTimer />
      </Section>

      {team && (
        <Section
          title="Backup uploads"
          description="Optional. Send your deck and demo video to the tech team in case the internet fails during your pitch."
        >
          <TeamUploads teamId={team.id} />
        </Section>
      )}

      <Section title="Program flow">
        <ScheduleList schedule={state.schedule} />
      </Section>
    </PageShell>
  );
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  }

  return { copied, copy };
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <Button size="sm" variant="ghost" onClick={copy}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function MaterialCard({ material }: { material: Material }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{material.title}</span>
        <div className="ml-auto flex items-center gap-1">
          {material.body && <CopyButton text={material.body} label="Copy template" />}
          {material.url && (
            <Button asChild size="sm" variant="outline">
              <a href={material.url} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                Open link
              </a>
            </Button>
          )}
        </div>
      </div>
      {material.description && <p className="text-sm whitespace-pre-line text-muted-foreground">{material.description}</p>}
      {material.body && (
        <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
          {material.body}
        </pre>
      )}
    </div>
  );
}

function PromptCard({ prompt }: { prompt: Prompt }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span className="font-medium">{prompt.title}</span>
        {prompt.tool && <Badge variant="secondary">{prompt.tool}</Badge>}
        <div className="ml-auto">
          <CopyButton text={prompt.body} />
        </div>
      </div>
      <p className="text-sm whitespace-pre-line text-muted-foreground">{prompt.body}</p>
    </div>
  );
}
