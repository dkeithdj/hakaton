# Hakaton

A quick platform on hosting a hackathon.

this is also an event page

this will be a hackathon platform where participants can show what to do and the progress. a timer. and a live voting mechanism after the time ends or when it is triggered.

## Admin page
there will be n number of teams
the admin page can create teams with the team members and team names
it can create topics that the teams can choose as a starting point
it can setup a timer for the duration of the hackathon (default 3 hours)
it can have a voting mechanism that anyone that enters the qr code/link can vote, it is also time gated (default 2 minutes)
once voting is done. voters cannot click the button
these votes are to choose the team who has the best pitch and demo presentation after the hackathon ends

## Participant page
the participants can see like this https://nexus-fornonprofits-devconleaders.vercel.app
this should have similar features
the participants can opt to upload their pitch decks and demo videos so the tech team can receive it and use as backup for whenever there are internet issues

## Voting page
https://v0-interactive-polling-app.vercel.app/poll/ac45aac3-3783-423f-bcbd-b75890ce8549 similar to this
during the voting/polling period it should not show the scores of each team. just the number of votes registered

## Viewer's page
it shows the current status of the hackathon, the schedules, program flow of the event

## Tech
the admin page can have a simple user password
the participants page too should have a simple user password which can be edited in the admin page and be provided to the participants
this will be deployed in cloudflare so use persistent storage and workers/pages to make this happen

use react, shadcn
hono for the workers

plan

---

# Running it

## Pages

| Path | Who | What |
| --- | --- | --- |
| `/` | Anyone | Live status, timer, program flow, team progress, results once published |
| `/participant` | Each team, with its own team password | Team workspace: timer, topic, checklist, prompt library, toolbox, pitch timer, backup uploads |
| `/vote` | Anyone with the QR code or link | Rate every team 1 to 5, once, while voting is open |
| `/admin` | Admin password | Teams, topics, schedule, prompts, tools, timer, voting, uploads, settings |

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

## How voting works

- The admin opens voting from the Control tab. It closes by itself after the voting window (default 2 minutes) or when the admin closes it.
- Each voter rates every team from 1 to 5 and submits once. The server rejects ballots outside the window.
- One ballot per browser, enforced with a signed cookie. A private window counts as a new voter, so this relies on voting happening in the room.
- While voting is open, everyone sees only the number of votes registered. Scores are visible to the admin, and to everyone after the admin publishes results.
