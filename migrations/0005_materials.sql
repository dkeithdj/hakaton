-- Resources the organizers hand to participants: links and copyable templates.
CREATE TABLE materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);

INSERT INTO materials (title, description, url, body, sort) VALUES (
  'Pitch deck template',
  'Copy this into your AI tool of choice together with your idea, and ask it to draft your deck.',
  '',
  'Create a pitch deck for a 5-minute hackathon pitch (about 3 minutes of talking, 2 minutes of live demo). Use the structure below. Keep every slide to one idea, with a short headline and at most three bullet points.

Slide 1 - Title: project name, one-line description, team name and members.
Slide 2 - Problem: who has this problem, how they deal with it today, and what it costs them.
Slide 3 - Solution: what we built and the one thing it does better than the current way.
Slide 4 - Demo: a placeholder slide that says "Live demo", listing the two or three steps we will show.
Slide 5 - How it works: the tools and AI we used, in plain language.
Slide 6 - Impact and next steps: who benefits, what we would build next, and our ask.

Our idea: [DESCRIBE YOUR IDEA]
Our users: [WHO IT IS FOR]
What the prototype does today: [WHAT WORKS]',
  1
);
