-- Event content for the production instance: organizer resources and the prompt library.
-- Kept out of migrations/ so a deploy never overwrites what the admin has edited.
-- Run it on purpose with `npm run db:seed:remote`. It REPLACES every resource and prompt.
-- Prompt tool names match the toolbox, so each prompt picks up its tool's color.

DELETE FROM materials;
INSERT INTO materials (title, description, url, body, sort) VALUES
(
  'The 17 Sustainable Development Goals',
  'Read the **targets** under the goals you picked. A target is a ready-made problem: specific, measurable, and already agreed to matter.',
  'https://sdgs.un.org/goals',
  '',
  1
),
(
  'Problem statement template',
  'Fill this in **before you build**. If the team cannot agree on every line, you are not ready to build yet.',
  '',
  'SGDs we are building on: [GOAL NUMBERS AND NAMES]

Who has the problem: [ONE SPECIFIC GROUP OF PEOPLE, NOT "EVERYONE"]
What they are trying to do: [THE TASK OR GOAL]
What gets in the way: [THE OBSTACLE]
How they cope today: [THE CURRENT WORKAROUND]
What it costs them: [TIME, MONEY, SAFETY, OR OPPORTUNITY LOST]

One-sentence problem statement:
[WHO] struggles to [WHAT] because [WHY], which costs them [COST].

One-sentence solution:
We help [WHO] to [WHAT] by [HOW], so that [RESULT].',
  2
),
(
  'Pitch deck template',
  'Copy this into **Gemini** or **Google Slides** together with your problem statement, and ask it to draft your deck. Keep it to *six slides*.',
  '',
  'Create a pitch deck for a 5-minute hackathon pitch: about 3 minutes of talking and 2 minutes of live demo. Use the structure below. Keep every slide to one idea, with a short headline and at most three bullet points.

Slide 1 - Title: project name, one-line description, team name and members, and the SGDs we are building on.
Slide 2 - Problem: who has this problem, how they deal with it today, and what it costs them.
Slide 3 - Solution: what we built and the one thing it does better than the current way.
Slide 4 - Demo: a placeholder slide that says "Live demo", listing the two or three steps we will show.
Slide 5 - How it works: the tools and AI we used, in plain language.
Slide 6 - Impact and next steps: how this moves our SGDs forward, who benefits, and what we would build next.

Our SGDs: [GOAL NUMBERS AND NAMES]
Our problem statement: [PASTE]
Our solution: [DESCRIBE YOUR IDEA]
What the prototype does today: [WHAT WORKS]',
  3
),
(
  'Five-minute pitch run sheet',
  'Decide **who speaks** and **who drives the demo**, then rehearse against the *pitch timer* at least twice.',
  '',
  '0:00 - 0:30  Hook. One person, one real moment: the problem as someone lives it.
0:30 - 1:15  Problem. Who has it, how they cope today, what it costs them. Name your SGDs.
1:15 - 1:45  Solution. What you built, in one sentence, and the one thing it does better.
1:45 - 3:45  Live demo. One flow from start to finish. Narrate what the user wants, not what you click.
3:45 - 4:30  Impact. Who benefits and how this moves your SGDs forward.
4:30 - 5:00  Next steps and thank you. What you would build next, and who you need to make it real.

Before your turn:
- Demo open in a browser tab, signed in, with sample data loaded
- Backup deck and demo video uploaded
- Laptop charged, notifications off',
  4
);

DELETE FROM prompts;
INSERT INTO prompts (title, tool, body, sort) VALUES
(
  'Find a problem inside your SGDs',
  'Gemini',
  'We are a student hackathon team building on these Sustainable Development Goals: [GOAL NUMBERS AND NAMES]. We are based in [CITY OR COMMUNITY].

List 8 specific, everyday problems connected to these goals that people around us actually face. For each one, give: who has the problem, what they do about it today, and why a small software prototype could help. Avoid problems that need hardware, government action, or more than a few hours to demonstrate.',
  1
),
(
  'Define the problem',
  'Gemini',
  'We are a hackathon team working on: [PROBLEM IDEA], connected to [SGDs].

Ask us five sharp questions, one at a time, to pin down who has this problem, how they handle it today, and what it costs them. After we answer, write a one-sentence problem statement in this form: [WHO] struggles to [WHAT] because [WHY], which costs them [COST].',
  2
),
(
  'Research the problem',
  'NotebookLM',
  'Using the sources I uploaded, summarize the evidence that this problem is real: who is affected, how many, how often, and what existing solutions miss. Cite each claim. Then give me the three strongest facts or numbers to use in a pitch.',
  3
),
(
  'Shape the solution',
  'Gemini',
  'Here is our problem statement: [PASTE].

Suggest five different ways software or AI could solve it. For each, describe the single most important screen and what the user does on it. Then recommend the one we can build and demo live in 90 minutes, and list what to leave out.',
  4
),
(
  'Design the main screen',
  'Stitch',
  'Design the main screen of a web app that [ONE-SENTENCE SOLUTION]. The primary user is [WHO]. Show the one action that delivers the core value, with realistic sample data. Keep it simple, friendly, and easy to read on a phone.',
  5
),
(
  'Build the prototype',
  'Google AI Studio',
  'Build a working web app prototype of this idea: [ONE-SENTENCE SOLUTION].

The user is [WHO]. Build only this one flow, end to end:
1. [STEP ONE]
2. [STEP TWO]
3. [STEP THREE]

Use realistic sample data that is already loaded. No sign-in, no settings, no extra pages. It must work well enough to demo live in two minutes.',
  6
),
(
  'Fix what is broken',
  'Google AI Studio or Antigravity',
  'This part of our prototype is not working: [DESCRIBE WHAT YOU EXPECTED AND WHAT HAPPENED].

Here is the error or the behavior we see: [PASTE].

Find the cause, fix only that, and explain the fix in one sentence. Do not change anything else.',
  7
),
(
  'Draft the pitch deck',
  'Google Slides',
  'Create a 6-slide pitch deck: title, problem, solution, live demo placeholder, how it works, impact and next steps. Keep each slide to one idea with a short headline and at most three bullet points.

Our SGDs: [GOAL NUMBERS AND NAMES]
Problem statement: [PASTE]
Solution: [PASTE]',
  8
),
(
  'Tighten the pitch',
  'Gemini',
  'Here is our pitch script: [PASTE].

Cut it to fit 3 minutes of talking plus a 2-minute live demo. Keep the strongest hook, remove jargon, say clearly which SGDs we are moving forward, and end on what we would build next. Mark where each speaker hands over.',
  9
),
(
  'Prepare for the judges',
  'Gemini',
  'We are pitching this project at a hackathon: [PASTE PROBLEM AND SOLUTION].

Act as a judge scoring on clarity of the problem, quality of the solution, and how real the prototype feels. Ask the five hardest questions you would ask us, then give a strong 20-second answer for each.',
  10
);
