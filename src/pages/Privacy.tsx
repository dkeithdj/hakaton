import { FullPageMessage, PageShell, Section } from "@/components/event";
import { useEventState, useNow } from "@/lib/api";

export default function Privacy() {
  const { data: state } = useEventState(30_000);
  const now = useNow(state?.clockOffset ?? 0);
  if (!state) return <FullPageMessage>Loading…</FullPageMessage>;
  const { eventName } = state.settings;

  return (
    <PageShell state={state} now={now}>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold">Privacy policy</h1>
          <p className="text-muted-foreground">
            This site exists only to run {eventName}. What it holds about you is used for this hackathon and nothing
            else, and it is deleted once the event is over.
          </p>
        </div>

        <Section title="What we hold">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            <li>
              <strong>Team and member names.</strong> The organizers enter the name of each team and of the people on
              it.
            </li>
            <li>
              <strong>Your team's work.</strong> The goals your team picks, the checklist steps it ticks off, and any
              pitch deck or demo video it chooses to upload.
            </li>
            <li>
              <strong>Votes.</strong> Each ballot is a set of 1 to 5 ratings stored against a random id. No name,
              email, or account is attached to it.
            </li>
            <li>
              <strong>Judge scores.</strong> The organizers enter a username for each judge, and each judge scores
              every team on pitch, demo, and impact. The username and the scores are stored.
            </li>
            <li>
              <strong>Cookies.</strong> One keeps a team, judge, or organizer signed in for up to 12 hours. One holds the
              random voter id for up to 24 hours, so each browser votes once. There are no advertising or analytics
              trackers.
            </li>
          </ul>
        </Section>

        <Section title="Why we hold it">
          <p className="text-sm">
            For the sole purpose of running this hackathon: showing teams and their progress on the live page, keeping
            a backup of each team's deck and video in case the venue's internet fails, and working out the final scores
            from the judges and the audience vote.
            It is not used for marketing, not sold, and not shared with anyone outside the organizing team.
          </p>
        </Section>

        <Section title="Who can see it">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            <li>Team names, member names, chosen goals, and checklist progress appear on the public live page.</li>
            <li>Uploaded files can be downloaded only by the organizers. Other teams and the public cannot open them.</li>
            <li>Individual ballots are never shown. Only vote counts and average scores are.</li>
            <li>
              Judge usernames and each judge's own scores are visible only to the organizers. The public sees the
              judges' average for each team.
            </li>
          </ul>
        </Section>

        <Section title="How it is kept secure">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            <li>Every connection to this site is encrypted.</li>
            <li>A team's workspace opens only with that team's password, and a team cannot reach another team's files.</li>
            <li>The organizer area is behind a separate password.</li>
            <li>
              Data and files are stored in private storage with our hosting provider, Cloudflare, which processes them
              only to deliver this site.
            </li>
          </ul>
        </Section>

        <Section title="When it is deleted">
          <p className="text-sm">
            When the event finishes, the organizers delete all member names, all judge usernames, every team's chosen
            goals and checklist progress, and every uploaded file. Only team names and the anonymous vote and judge
            scores remain. The hosting
            provider's automatic database backups expire within 30 days of that.
          </p>
        </Section>

        <Section title="Your choices">
          <p className="text-sm">
            Uploading a deck or video is optional. To have your name corrected or removed, or a file deleted before
            the event ends, ask any organizer at the event or email{" "}
            <a href="mailto:davao@devcon.ph" className="font-medium underline underline-offset-4">
              davao@devcon.ph
            </a>
            .
          </p>
        </Section>
      </div>
    </PageShell>
  );
}
