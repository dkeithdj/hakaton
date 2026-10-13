import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DownloadIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FullPageMessage, HackTimer, PageShell, ResultsList, Section, VoteQr } from "@/components/event";
import { LoginCard } from "@/components/LoginCard";
import { ResourceEditor, type EditorField } from "@/components/ResourceEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage, formatBytes, formatDuration, useEventState, useMe, useNow, type ClientState } from "@/lib/api";
import {
  AUDIENCE_MAX_RATING,
  getPhase,
  JUDGE_CRITERIA,
  JUDGE_MAX_SCORE,
  judgeTotal,
  type AdminTeam,
  type Judge,
  type JudgeScore,
  type Material,
  type Milestone,
  type Prompt,
  type PublicSettings,
  type Settings,
  type TeamResult,
  type Tool,
  type Upload,
} from "../../shared/types";

interface AdminData {
  settings: Settings;
  teams: AdminTeam[];
  materials: Material[];
  prompts: Prompt[];
  tools: Tool[];
  uploads: Upload[];
  results: TeamResult[];
  judges: Judge[];
  judgeScores: JudgeScore[];
}

const sortField: EditorField = { key: "sort", label: "Order", type: "number" };

export default function Admin() {
  const me = useMe();
  const { data: state } = useEventState(3000);
  if (me.isPending || !state) return <FullPageMessage>Loading…</FullPageMessage>;
  if (me.data?.role !== "admin") {
    return <LoginCard role="admin" title={`${state.settings.eventName} · Admin`} description="Enter the admin password." />;
  }
  return <Dashboard state={state} />;
}

function Dashboard({ state }: { state: ClientState }) {
  const queryClient = useQueryClient();
  const now = useNow(state.clockOffset);
  const admin = useQuery({
    queryKey: ["admin"],
    queryFn: () => api<AdminData>("/api/admin/data"),
    refetchInterval: 5000,
  });
  const logout = useMutation({
    mutationFn: () => api("/api/logout", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  const { topics, schedule } = state;
  const teamFields: EditorField[] = [
    { key: "name", label: "Team name", type: "text" },
    { key: "projectTitle", label: "Project title", type: "text", placeholder: "Teams can set this themselves" },
    { key: "members", label: "Members", type: "lines", placeholder: "One member per line" },
    { key: "password", label: "Team password", type: "text", placeholder: "Leave blank to generate one" },
    sortField,
  ];

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
      <Tabs defaultValue="control">
        <TabsList className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto">
          <TabsTrigger value="control">Control</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="judges">Judges</TabsTrigger>
          <TabsTrigger value="topics">Topics</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="content">Resources & prompts</TabsTrigger>
          <TabsTrigger value="uploads">Uploads</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="control" className="flex flex-col gap-6">
          <Control
            state={state}
            now={now}
            results={admin.data?.results ?? []}
            judges={admin.data?.judges ?? []}
            scores={admin.data?.judgeScores ?? []}
          />
          <JudgeScores state={state} judges={admin.data?.judges ?? []} scores={admin.data?.judgeScores ?? []} />
        </TabsContent>
        <TabsContent value="teams">
          <ResourceEditor
            resource="teams"
            title="Teams"
            description="Give each team its password. A team can only open its own workspace. Changing a password signs that team out."
            singular="team"
            items={(admin.data?.teams ?? []) as never}
            fields={teamFields}
          />
        </TabsContent>
        <TabsContent value="judges">
          <ResourceEditor
            resource="judges"
            title="Judges"
            description="Only the judges listed here can sign in at /judge, by typing their username. Removing a judge deletes their scores."
            singular="judge"
            items={(admin.data?.judges ?? []) as never}
            fields={[{ key: "name", label: "Username", type: "text" }, sortField]}
          />
        </TabsContent>
        <TabsContent value="topics">
          <ResourceEditor
            resource="topics"
            title="Topics"
            description="The Sustainable Development Goals teams start from. A team can pick more than one. The order is the number shown on each goal."
            singular="topic"
            items={topics as never}
            fields={[
              { key: "title", label: "Title", type: "text" },
              { key: "description", label: "Description", type: "textarea" },
              { key: "color", label: "Color", type: "text", placeholder: "#E5243B" },
              sortField,
            ]}
          />
        </TabsContent>
        <TabsContent value="schedule">
          <ResourceEditor
            resource="schedule"
            title="Program flow"
            description="Shown on the public page."
            singular="schedule item"
            items={schedule as never}
            fields={[
              { key: "timeLabel", label: "Time", type: "text", placeholder: "1:00 PM" },
              { key: "title", label: "Title", type: "text" },
              { key: "description", label: "Description", type: "textarea" },
              sortField,
            ]}
          />
        </TabsContent>
        <TabsContent value="content" className="flex flex-col gap-6">
          <ResourceEditor
            resource="materials"
            title="Organizer resources"
            description="Links and templates you provide to every team, such as a pitch deck template to paste into their AI tool. Fill in a link, template text, or both."
            singular="resource"
            items={(admin.data?.materials ?? []) as never}
            fields={[
              { key: "title", label: "Title", type: "text" },
              { key: "description", label: "Description", type: "textarea", hideInTable: true },
              { key: "url", label: "Link (optional)", type: "text", placeholder: "https://" },
              {
                key: "body",
                label: "Template text (optional)",
                type: "textarea",
                placeholder: "Text participants can copy into their AI tool",
                hideInTable: true,
              },
              sortField,
            ]}
          />
          <ResourceEditor
            resource="prompts"
            title="Prompt library"
            singular="prompt"
            items={(admin.data?.prompts ?? []) as never}
            fields={[
              { key: "title", label: "Title", type: "text" },
              { key: "tool", label: "Recommended tool", type: "text" },
              { key: "body", label: "Prompt", type: "textarea", hideInTable: true },
              sortField,
            ]}
          />
          <ResourceEditor
            resource="tools"
            title="Toolbox"
            description="Tools whose vendor is Google are shown first to participants. The color marks the tool wherever it appears."
            singular="tool"
            items={(admin.data?.tools ?? []) as never}
            fields={[
              { key: "name", label: "Name", type: "text" },
              { key: "description", label: "Description", type: "textarea" },
              { key: "url", label: "Link", type: "text", placeholder: "https://" },
              { key: "vendor", label: "Vendor", type: "text", placeholder: "Google" },
              { key: "color", label: "Color", type: "text", placeholder: "#4285F4" },
              sortField,
            ]}
          />
        </TabsContent>
        <TabsContent value="uploads">
          <Uploads state={state} uploads={admin.data?.uploads ?? []} />
        </TabsContent>
        <TabsContent value="settings">{admin.data && <SettingsForm settings={admin.data.settings} />}</TabsContent>
      </Tabs>
    </PageShell>
  );
}

function Control({
  state,
  now,
  results,
  judges,
  scores,
}: {
  state: ClientState;
  now: number;
  results: TeamResult[];
  judges: Judge[];
  scores: JudgeScore[];
}) {
  const queryClient = useQueryClient();
  const { settings } = state;
  const phase = getPhase(settings, now);

  const action = useMutation({
    mutationFn: (path: string) => api<PublicSettings>(`/api/admin/${path}`, { method: "POST" }),
    onSuccess: (updated) => {
      queryClient.setQueryData<ClientState>(["state"], (current) => current && { ...current, settings: updated });
      queryClient.invalidateQueries({ queryKey: ["state"] });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const purge = useMutation({
    mutationFn: () => api("/api/admin/participant-data", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["state"] });
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      toast.success("Participant data deleted");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const running = settings.hackEndsAt !== null && settings.hackEndsAt > now;
  const paused = settings.hackPausedRemainingMs !== null;
  const votingOpen = settings.voteEndsAt !== null && now < settings.voteEndsAt;
  const votingClosed = settings.voteEndsAt !== null && !votingOpen;

  return (
    <>
      <Section
        title="Participant access"
        description="Teams can sign in at /participant and use their workspace only while this is open."
      >
        <div className="flex flex-wrap items-center gap-6">
          <span className="font-mono text-3xl">{settings.participantAccess ? "Open" : "Closed"}</span>
          {settings.participantAccess ? (
            <ConfirmButton
              title="Close participant access?"
              description="Teams are locked out of their workspace until you open it again. They stay signed in."
              confirmLabel="Close access"
              onConfirm={() => action.mutate("participants/close")}
            >
              <Button variant="outline">Close access</Button>
            </ConfirmButton>
          ) : (
            <Button disabled={action.isPending} onClick={() => action.mutate("participants/open")}>
              Open access
            </Button>
          )}
        </div>
      </Section>

      <Section title="Hackathon timer" description={`Duration: ${settings.hackDurationMin} minutes. Change it under Settings.`}>
        <div className="flex flex-wrap items-center gap-6">
          <HackTimer settings={settings} now={now} className="text-5xl" />
          <div className="flex flex-wrap gap-2">
            {running ? (
              <Button variant="outline" disabled={action.isPending} onClick={() => action.mutate("timer/pause")}>
                Pause
              </Button>
            ) : (
              <Button disabled={action.isPending} onClick={() => action.mutate("timer/start")}>
                {paused ? "Resume" : settings.hackEndsAt !== null ? "Restart" : "Start"}
              </Button>
            )}
            <ConfirmButton
              title="Reset the hackathon timer?"
              description="The countdown goes back to the full duration and stops."
              confirmLabel="Reset"
              onConfirm={() => action.mutate("timer/reset")}
            >
              <Button variant="ghost">Reset</Button>
            </ConfirmButton>
          </div>
        </div>
      </Section>

      <Section
        title="Voting"
        description={`Window: ${settings.voteDurationSec} seconds. ${state.ballotCount} ${state.ballotCount === 1 ? "vote" : "votes"} registered.`}
      >
        <div className="flex flex-wrap items-start gap-8">
          <div className="flex flex-col gap-4">
            <div className="font-mono text-5xl font-semibold tabular-nums">
              {votingOpen ? formatDuration(settings.voteEndsAt! - now) : votingClosed ? "Closed" : "Not open"}
            </div>
            <div className="flex flex-wrap gap-2">
              {votingOpen ? (
                <Button variant="outline" disabled={action.isPending} onClick={() => action.mutate("voting/close")}>
                  Close now
                </Button>
              ) : (
                <Button disabled={action.isPending} onClick={() => action.mutate("voting/open")}>
                  {votingClosed ? "Reopen voting" : "Open voting"}
                </Button>
              )}
              {votingClosed &&
                (settings.resultsPublished ? (
                  <Button variant="outline" disabled={action.isPending} onClick={() => action.mutate("voting/unpublish")}>
                    Hide results
                  </Button>
                ) : (
                  <ConfirmButton
                    title="Publish these results?"
                    description="Check every score below. Once published, everyone sees the ranking and judges can no longer change their scores."
                    confirmLabel="Publish results"
                    onConfirm={() => action.mutate("voting/publish")}
                    details={<PublishReview state={state} results={results} judges={judges} scores={scores} />}
                    confirmDisabled={judges.length === 0 || scores.length < judges.length * state.teams.length}
                    className="data-[size=default]:sm:max-w-3xl"
                  >
                    <Button disabled={action.isPending}>Publish results</Button>
                  </ConfirmButton>
                ))}
              <ConfirmButton
                title="Delete all votes?"
                description="Every ballot is erased and voting returns to not open. This cannot be undone."
                confirmLabel="Delete votes"
                onConfirm={() => action.mutate("voting/reset")}
              >
                <Button variant="destructive">Reset votes</Button>
              </ConfirmButton>
            </div>
          </div>
          <VoteQr size={160} />
        </div>
      </Section>

      <Section
        title="Scores"
        description={
          phase === "results" ? "Published. Everyone can see these." : "Only you can see these until you publish results."
        }
      >
        {state.teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">Create teams first.</p>
        ) : (
          <ResultsList teams={state.teams} results={results} />
        )}
      </Section>

      <Section
        title="Participant data"
        description="Once the event is over, erase member names, judge names, each team's project title, goals, and checklist, and every uploaded file. Team names and scores stay."
      >
        <ConfirmButton
          title="Delete all participant data?"
          description="Member names, judge names, project titles, chosen goals, checklist progress, and all uploaded decks and videos are erased for every team. Download any files you still need first. This cannot be undone."
          confirmLabel="Delete participant data"
          onConfirm={() => purge.mutate()}
        >
          <Button variant="destructive" disabled={purge.isPending}>
            Delete participant data
          </Button>
        </ConfirmButton>
      </Section>
    </>
  );
}

/** Everything that goes into the ranking, in the order it will be published. */
function PublishReview({
  state,
  results,
  judges,
  scores,
}: {
  state: ClientState;
  results: TeamResult[];
  judges: Judge[];
  scores: JudgeScore[];
}) {
  const rows = state.teams
    .map((team) => ({ team, result: results.find((entry) => entry.teamId === team.id) }))
    .sort((a, b) => (b.result?.final ?? 0) - (a.result?.final ?? 0));
  const missing = judges.length * state.teams.length - scores.length;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="max-h-[50vh] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              {judges.map((judge, index) => (
                <TableHead key={judge.id}>{judge.name || `Judge ${index + 1}`}</TableHead>
              ))}
              <TableHead>Judges / {JUDGE_MAX_SCORE}</TableHead>
              <TableHead>Audience / {AUDIENCE_MAX_RATING}</TableHead>
              <TableHead>Final / 100</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ team, result }, index) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">
                  {index + 1}. {team.name}
                </TableCell>
                {judges.map((judge) => {
                  const entry = scores.find((score) => score.judgeId === judge.id && score.teamId === team.id);
                  return (
                    <TableCell key={judge.id} className="font-mono tabular-nums">
                      {entry ? (
                        <>
                          {judgeTotal(entry)}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {JUDGE_CRITERIA.map((criterion) => entry[criterion.key]).join(" + ")}
                          </span>
                        </>
                      ) : (
                        "–"
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="font-mono tabular-nums">
                  {result?.judgeAverage == null ? "–" : result.judgeAverage.toFixed(1)}
                </TableCell>
                <TableCell className="font-mono tabular-nums">
                  {result?.audienceAverage == null ? (
                    "–"
                  ) : (
                    <>
                      {result.audienceAverage.toFixed(2)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {result.audienceCount} {result.audienceCount === 1 ? "vote" : "votes"}
                      </span>
                    </>
                  )}
                </TableCell>
                <TableCell className="font-mono font-semibold tabular-nums">{(result?.final ?? 0).toFixed(1)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {judges.length === 0 ? (
        <p className="text-sm text-destructive">Add at least one judge before publishing.</p>
      ) : (
        missing > 0 && (
          <p className="text-sm text-destructive">
            {missing} {missing === 1 ? "score is" : "scores are"} missing. Every judge has to score every team first.
          </p>
        )
      )}
    </div>
  );
}

function JudgeScores({ state, judges, scores }: { state: ClientState; judges: Judge[]; scores: JudgeScore[] }) {
  const { teams } = state;
  const missing = judges.length * teams.length - scores.length;
  const criteria = JUDGE_CRITERIA.map((criterion) => `${criterion.label} ${criterion.max}`).join(", ");

  return (
    <Section
      title="Judge scores"
      description={`Judges sign in at ${window.location.origin}/judge and score each team at any time until results are published. ${criteria}.`}
    >
      {judges.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add judges under the Judges tab.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                {judges.map((judge, index) => (
                  // Names are blank once participant data is deleted.
                  <TableHead key={judge.id}>{judge.name || `Judge ${index + 1}`}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  {judges.map((judge) => {
                    const entry = scores.find((score) => score.judgeId === judge.id && score.teamId === team.id);
                    return (
                      <TableCell key={judge.id} className="font-mono tabular-nums">
                        {entry ? (
                          <>
                            {judgeTotal(entry)}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {JUDGE_CRITERIA.map((criterion) => entry[criterion.key]).join(" + ")}
                            </span>
                          </>
                        ) : (
                          "–"
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">
            {missing > 0
              ? `${missing} ${missing === 1 ? "score is" : "scores are"} missing. Results can be published once every judge has scored every team.`
              : "Every judge has scored every team."}
          </p>
        </div>
      )}
    </Section>
  );
}

function Uploads({ state, uploads }: { state: ClientState; uploads: Upload[] }) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (id: number) => api(`/api/admin/uploads/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <Section title="Backup uploads" description="Pitch decks and demo videos sent by teams.">
      {uploads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No uploads yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>File</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploads.map((upload) => (
              <TableRow key={upload.id}>
                <TableCell>{state.teams.find((team) => team.id === upload.teamId)?.name ?? "—"}</TableCell>
                <TableCell>{upload.kind === "deck" ? "Pitch deck" : "Demo video"}</TableCell>
                <TableCell className="max-w-64 truncate">{upload.filename}</TableCell>
                <TableCell>{formatBytes(upload.size)}</TableCell>
                <TableCell>{new Date(upload.createdAt).toLocaleTimeString()}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="icon-sm" variant="ghost">
                    <a href={`/api/admin/uploads/${upload.id}/download`} aria-label={`Download ${upload.filename}`}>
                      <DownloadIcon />
                    </a>
                  </Button>
                  <ConfirmButton
                    title="Delete this file?"
                    description="The file is removed from storage. This cannot be undone."
                    confirmLabel="Delete"
                    onConfirm={() => remove.mutate(upload.id)}
                  >
                    <Button size="icon-sm" variant="ghost" aria-label={`Delete ${upload.filename}`}>
                      <Trash2Icon />
                    </Button>
                  </ConfirmButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

const FORMATTING_HELP = "Formatting: **bold**, *italic*, `code`, and lines starting with “- ” become bullets.";

function milestonesToText(milestones: Milestone[]): string {
  return milestones
    .map((milestone) => [milestone.title, milestone.minutes, ...(milestone.hint ? [milestone.hint] : [])].join(" | "))
    .join("\n");
}

function textToMilestones(text: string): Milestone[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, minutes = "", ...hint] = line.split("|").map((part) => part.trim());
      return { title, minutes: Number(minutes) || 0, hint: hint.join(" | ") };
    });
}

function SettingsForm({ settings }: { settings: Settings }) {
  const queryClient = useQueryClient();
  const toForm = (source: Settings) => ({
    eventName: source.eventName,
    tagline: source.tagline,
    hackDurationMin: String(source.hackDurationMin),
    voteDurationSec: String(source.voteDurationSec),
    guidelines: source.guidelines,
    milestones: milestonesToText(source.milestones),
  });
  const [form, setForm] = useState(() => toForm(settings));
  const [dirty, setDirty] = useState(false);

  // Follow server changes (another admin tab) unless there are unsaved edits.
  const serialized = JSON.stringify(toForm(settings));
  useEffect(() => {
    if (!dirty) setForm(JSON.parse(serialized));
  }, [serialized, dirty]);

  const save = useMutation({
    mutationFn: () =>
      api("/api/admin/settings", {
        method: "PUT",
        body: {
          ...form,
          hackDurationMin: Number(form.hackDurationMin),
          voteDurationSec: Number(form.voteDurationSec),
          milestones: textToMilestones(form.milestones),
        },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin"] }),
        queryClient.invalidateQueries({ queryKey: ["state"] }),
      ]);
      setDirty(false);
      toast.success("Settings saved");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const field = (key: keyof typeof form) => ({
    id: `settings-${key}`,
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setDirty(true);
      setForm((current) => ({ ...current, [key]: event.target.value }));
    },
  });

  return (
    <Section title="Settings" description="Duration changes apply the next time the timer or voting starts.">
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-eventName">Event name</Label>
            <Input {...field("eventName")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-tagline">Tagline</Label>
            <Input {...field("tagline")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-hackDurationMin">Hackathon duration (minutes)</Label>
            <Input type="number" min={1} {...field("hackDurationMin")} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="settings-voteDurationSec">Voting window (seconds)</Label>
            <Input type="number" min={10} {...field("voteDurationSec")} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="settings-guidelines">Presentation guidelines</Label>
          <Textarea rows={6} {...field("guidelines")} />
          <p className="text-xs text-muted-foreground">{FORMATTING_HELP}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="settings-milestones">Checklist milestones</Label>
          <Textarea rows={6} {...field("milestones")} />
          <p className="text-xs text-muted-foreground">
            One per line as “Title | minutes | what to do”. The last part is optional and shown under the title.{" "}
            {FORMATTING_HELP} Reordering or removing lines shifts what teams have already ticked.
          </p>
        </div>
        <div>
          <Button type="submit" disabled={save.isPending || !dirty}>
            Save settings
          </Button>
        </div>
      </form>
    </Section>
  );
}
