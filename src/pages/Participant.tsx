import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckIcon, ChevronDownIcon, CopyIcon, ExternalLinkIcon, LightbulbIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  FullPageMessage,
  HackTimer,
  PageShell,
  ScheduleList,
  Section,
  SGD_URL,
  sgdLabel,
  SgdTooltip,
  VoteQr,
} from "@/components/event";
import { LoginCard } from "@/components/LoginCard";
import { PitchTimer } from "@/components/PitchTimer";
import { RichText } from "@/components/RichText";
import { TeamUploads } from "@/components/TeamUploads";
import { api, errorMessage, useEventState, useMe, useNow, type ClientState } from "@/lib/api";
import { cn } from "@/lib/utils";
import { getPhase, type Material, type Me, type Prompt, type Team, type Tool } from "../../shared/types";

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
    mutationFn: (patch: Partial<Pick<Team, "projectTitle" | "topicIds" | "progress">>) =>
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
  const selected = team ? topics.filter((topic) => team.topicIds.includes(topic.id)) : [];
  const tools = content.data?.tools ?? [];
  const googleTools = tools.filter(isGoogle);
  const otherTools = tools.filter((tool) => !isGoogle(tool));

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
            <div className="flex min-w-0 flex-col gap-2">
              {teams.map((entry) => (
                <Button
                  key={entry.id}
                  variant={entry.id === teamId ? "default" : "outline"}
                  className="h-auto justify-start py-3 text-left"
                  onClick={() => chooseTeam(entry.id)}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{entry.name}</span>
                    <span className="truncate text-xs font-normal opacity-70">{entry.members.join(", ")}</span>
                  </span>
                </Button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-2xl bg-subay px-6 py-3 text-white">
        <div>
          {team && <p className="font-heading text-xl font-semibold">{team.name}</p>}
          <p className="text-sm tracking-widest text-white/85 uppercase">
            {phase === "upcoming" ? "Sprint duration" : "Sprint time remaining"}
          </p>
        </div>
        <HackTimer settings={settings} now={now} className="text-5xl leading-none text-white sm:text-6xl" />
      </section>

      {team && (
        <Section
          title="Project title"
          description="Voters and judges see this under your team name. You can change it any time."
        >
          <ProjectTitle
            key={team.id}
            value={team.projectTitle}
            onSave={(projectTitle, done) => updateTeam.mutate({ projectTitle }, { onSettled: done })}
          />
        </Section>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="flex flex-col gap-4">
          {phase === "voting" && (
            <Section title="Voting is live!" description="Scan to rate every team's pitch and demo.">
              <VoteQr />
            </Section>
          )}

          <div role="note" className="flex gap-3 rounded-xl border-2 border-warning/60 bg-warning/10 p-3">
            <LightbulbIcon className="mt-0.5 size-5 shrink-0 text-warning" />
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Everything here is a guide, not a rule.</p>
              <p className="text-sm">
                The goals, prompts, and tools are starting points. Use whatever tools get your team to a working demo.
              </p>
            </div>
          </div>

          {team && (
            <Section
              title="Your challenge"
              description={
                selected.length === 0
                  ? "Pick one or more Sustainable Development Goals to build on. You can change them any time."
                  : `${selected.length} of ${topics.length} goals chosen`
              }
              action={
                <Button asChild size="sm" variant="outline">
                  <a href={SGD_URL} target="_blank" rel="noreferrer">
                    <ExternalLinkIcon />
                    About the SGDs
                  </a>
                </Button>
              }
            >
              <div className="flex flex-col gap-3">
                {team.members.length > 0 && <p className="text-sm text-muted-foreground">{team.members.join(", ")}</p>}
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-4 2xl:grid-cols-6">
                  {topics.map((topic) => {
                    const active = team.topicIds.includes(topic.id);
                    return (
                      <SgdTooltip key={topic.id} topic={topic}>
                        <button
                          type="button"
                          aria-pressed={active}
                          aria-label={sgdLabel(topic)}
                          onClick={() =>
                            updateTeam.mutate({
                              topicIds: active
                                ? team.topicIds.filter((id) => id !== topic.id)
                                : [...team.topicIds, topic.id],
                            })
                          }
                          className={cn(
                            "relative flex aspect-square flex-col justify-between rounded-lg p-1.5 text-left text-white transition",
                            active && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
                            selected.length > 0 && !active && "opacity-45 hover:opacity-100",
                          )}
                          style={{ backgroundColor: topic.color || "var(--primary)" }}
                        >
                          <span className="text-xl leading-none font-bold">{topic.sort}</span>
                          {active && <CheckIcon className="absolute top-1.5 right-1.5 size-4" />}
                          <span className="text-[0.625rem] leading-tight font-semibold uppercase">{topic.title}</span>
                        </button>
                      </SgdTooltip>
                    );
                  })}
                </div>
                {selected.map((topic) => (
                  <p key={topic.id} className="text-sm">
                    <span className="font-medium">{sgdLabel(topic)}.</span>{" "}
                    <span className="text-muted-foreground">{topic.description}</span>
                  </p>
                ))}
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
              <div className="flex flex-col gap-3">
                <Progress value={(done.length / milestones.length) * 100} />
                {milestones.map((milestone, index) => (
                  <label key={index} className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      className="mt-0.5"
                      checked={done.includes(index)}
                      onCheckedChange={(checked) =>
                        updateTeam.mutate({
                          progress: checked ? [...done, index] : done.filter((entry) => entry !== index),
                        })
                      }
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className={done.includes(index) ? "text-muted-foreground line-through" : "font-medium"}>
                          {milestone.title}
                        </span>
                        {milestone.minutes > 0 && <Badge variant="secondary">{milestone.minutes} min</Badge>}
                      </span>
                      {milestone.hint && !done.includes(index) && (
                        <RichText text={milestone.hint} className="text-sm text-muted-foreground" />
                      )}
                    </span>
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
                  <RichText text={settings.guidelines} className="text-sm leading-relaxed" />
                </CollapsibleContent>
              </Section>
            </Collapsible>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {tools.length > 0 && (
            <Section title="Toolbox" description="Suggestions only. Most have a free tier. Use any tool you like.">
              <div className="flex flex-col gap-3">
                {googleTools.length > 0 && (
                  <div className="overflow-hidden rounded-xl border-2 border-[#4285F4]/40 bg-[#4285F4]/5">
                    <div className="h-1.5 bg-[linear-gradient(90deg,#4285F4_25%,#EA4335_25%_50%,#FBBC05_50%_75%,#34A853_75%)]" />
                    <div className="flex flex-col gap-2 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading font-semibold">Start here: Google tools</p>
                        <Badge className="bg-[#4285F4] text-white">Recommended first</Badge>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {googleTools.map((tool) => (
                          <ToolCard key={tool.id} tool={tool} featured />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {otherTools.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {googleTools.length > 0 && <p className="text-sm font-medium text-muted-foreground">More tools</p>}
                    <div className="grid gap-2 sm:grid-cols-2">
                      {otherTools.map((tool) => (
                        <ToolCard key={tool.id} tool={tool} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
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

          <Section title="Pitch timer" description="Rehearse against the clock. It beeps at zero.">
            <PitchTimer />
          </Section>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2 xl:col-span-1">
          {content.data && content.data.prompts.length > 0 && (
            <Section
              title="Prompt library"
              description="Copy-ready prompts for each phase of the build. Optional. Paste them into any AI tool and adapt them."
            >
              <div className="flex flex-col gap-3">
                {content.data.prompts.map((prompt) => (
                  <PromptCard key={prompt.id} prompt={prompt} tools={tools} />
                ))}
              </div>
            </Section>
          )}

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
        </div>
      </div>
    </PageShell>
  );
}

/** Saves when the team leaves the box or presses Enter. Voters and judges see the title next to the team name. */
function ProjectTitle({ value, onSave }: { value: string; onSave: (title: string, done: () => void) => void }) {
  // null while not editing, so a title changed by a teammate shows up on the next poll.
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    if (draft.trim() === value) setDraft(null);
    else onSave(draft.trim(), () => setDraft(null));
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
    >
      <Input
        aria-label="Project title"
        placeholder="Add your project title"
        maxLength={100}
        className="h-auto py-2 font-heading text-xl font-semibold md:text-xl"
        value={draft ?? value}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
      />
    </form>
  );
}

function isGoogle(tool: Tool): boolean {
  return tool.vendor.trim().toLowerCase() === "google";
}

function ToolDot({ tool, className }: { tool: Tool; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex shrink-0 items-center justify-center rounded-md font-bold text-white", className)}
      style={{ backgroundColor: tool.color || "var(--muted-foreground)" }}
    >
      {tool.name.charAt(0)}
    </span>
  );
}

/** Featured cards are larger and tinted, so the eye lands on them before the rest of the toolbox. */
function ToolCard({ tool, featured = false }: { tool: Tool; featured?: boolean }) {
  return (
    <a
      href={tool.url || undefined}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex gap-2.5 rounded-lg border border-l-4 bg-card hover:bg-muted/50",
        featured ? "p-3 shadow-sm" : "p-2",
      )}
      style={{ borderLeftColor: tool.color || undefined }}
    >
      <ToolDot tool={tool} className={featured ? "size-9 text-base" : "size-6 text-xs"} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn("flex items-center gap-1.5 font-medium", !featured && "text-sm")}>
          {tool.name}
          {tool.url && <ExternalLinkIcon className="size-3.5 text-muted-foreground" />}
        </span>
        <span className={cn("text-muted-foreground", featured ? "text-sm" : "text-xs")}>{tool.description}</span>
      </span>
    </a>
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
      {material.description && <RichText text={material.description} className="text-sm text-muted-foreground" />}
      {material.body && (
        <pre className="max-h-56 overflow-auto rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap">
          {material.body}
        </pre>
      )}
    </div>
  );
}

function PromptCard({ prompt, tools }: { prompt: Prompt; tools: Tool[] }) {
  // The recommendation is free text such as "Google AI Studio or Antigravity", so take the longest name it mentions.
  const tool = [...tools]
    .sort((a, b) => b.name.length - a.name.length)
    .find((entry) => prompt.tool.toLowerCase().includes(entry.name.toLowerCase()));
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{prompt.title}</span>
        {prompt.tool && (
          <Badge variant="secondary" className="gap-1.5">
            {tool && <ToolDot tool={tool} className="size-3.5 text-[0.5rem]" />}
            {prompt.tool}
          </Badge>
        )}
        <div className="ml-auto">
          <CopyButton text={prompt.body} />
        </div>
      </div>
      <p className="text-sm whitespace-pre-line text-muted-foreground">{prompt.body}</p>
    </div>
  );
}
