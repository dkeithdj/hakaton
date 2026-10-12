# Hakaton

A lightweight platform for hosting a hackathon that also serves as the event page.

Participants can see what to do and track their progress, everyone can follow a live timer, and the audience can vote live once time runs out or when the admin opens voting.

## Admin page

- Create any number of teams, each with a team name and members.
- Create topics that teams can choose as a starting point.
- Set the hackathon timer (default: 3 hours).
- Run a voting round that anyone with the QR code or link can join.
  - Voting is time-gated (default: 2 minutes); once it closes, voters can no longer submit.
  - Votes pick the team with the best pitch and demo presentation after the hackathon ends.

## Participant page

- A team workspace showing the challenge, resources, and the team's progress.
- Teams can optionally upload their pitch decks and demo videos so the tech team has a backup in case of internet issues.

## Voting page

- A simple live poll listing the teams.
- While voting is open, it shows only the number of votes registered, never each team's score.

## Viewer page

- Shows the current status of the hackathon, the schedule, and the program flow of the event.

## Tech

- The admin page is protected by a simple password.
- The participant page is also protected by a simple password, which the admin can edit and hand out to participants.
- Deployed on Cloudflare, using Workers/Pages with persistent storage.
- Stack: React and shadcn for the UI, Hono for the Worker.

---

# Running it

## Pages

| Path | Who | What |
| --- | --- | --- |
| `/` | Anyone | Live status, timer, program flow, team progress, results once published |
| `/participant` | Each team, with its own team password | Team workspace: timer, SGD picker, checklist, prompt library, toolbox, pitch timer, backup uploads |
| `/vote` | Anyone with the QR code or link | Rate every team 1 to 5, once, while voting is open |
| `/admin` | Admin password | Teams, topics, schedule, prompts, tools, timer, voting, uploads, settings, deleting participant data |
| `/privacy` | Anyone | Privacy policy, linked from every page footer and the sign-in cards |

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars   # admin password is "admin" locally
npm run db:migrate:local
npm run dev
```

Each team signs in on `/participant` by picking its team and entering that team's password. Set or view team passwords under Admin → Teams; leaving the password blank generates one. A team can only open its own workspace, and changing a team's password signs that team out.

`npm test` runs the API tests (Workers runtime) and the page smoke tests (jsdom).

## Deploying to Cloudflare

```sh
npx wrangler d1 create hakaton              # copy the database_id into wrangler.jsonc
npx wrangler r2 bucket create hakaton-uploads
npm run db:migrate:remote
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put SESSION_SECRET      # any long random string
npm run deploy
```

### Seeding the event content

`seeds/production.sql` holds the organizer resources and the prompt library for the event. It is not a migration, so deploys never touch it. Run it on purpose:

```sh
npm run db:seed:local     # try it on the local database first
npm run db:seed:remote    # production
```

It **replaces every resource and prompt**, including anything edited in Admin → Resources & prompts. Teams, topics, tools, schedule, settings, and votes are left alone.

## How voting works

- The admin opens voting from the Control tab. It closes by itself after the voting window (default 2 minutes) or when the admin closes it.
- Each voter rates every team from 1 to 5 and submits once. The server rejects ballots outside the window.
- One ballot per browser, enforced with a signed cookie. A private window counts as a new voter, so this relies on voting happening in the room.
- While voting is open, everyone sees only the number of votes registered. Scores are visible to the admin, and to everyone after the admin publishes results.

## Privacy and data deletion

- The database holds team names, member names, each team's chosen goals and checklist progress, and anonymous ballots. Uploaded decks and videos live in R2.
- The policy at `/privacy` tells participants this data is used only for the hackathon and deleted when it ends. Keep it true: after the event, open the Control tab and press **Delete participant data**.
- That button erases member names, chosen goals, checklist progress, and every uploaded file for all teams. Team names and vote scores stay. Download any files you still need first.
- D1 keeps point-in-time backups for up to 30 days, so deleted rows remain restorable by the Cloudflare account owner until those expire.
