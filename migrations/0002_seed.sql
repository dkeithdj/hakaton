INSERT INTO prompts (title, tool, body, sort) VALUES
  ('Define the problem', 'Claude', 'We are a hackathon team working on: [TOPIC]. Ask us five sharp questions to pin down who has this problem, how they handle it today, and what it costs them. Then write a one-paragraph problem statement.', 1),
  ('Map the workflow', 'Claude', 'Here is our problem statement: [PASTE]. Map the current workflow step by step, mark the slowest and most error-prone steps, and suggest where software or AI changes the work the most.', 2),
  ('Research the problem', 'NotebookLM', 'Using the sources I uploaded, summarize the evidence that this problem is real: who is affected, how often, and what existing solutions miss. Cite each claim.', 3),
  ('Design a screen', 'Stitch', 'Design the main screen of a web app that [ONE-SENTENCE IDEA]. The primary user is [USER]. Show the one action that delivers the core value, with realistic sample data.', 4),
  ('Build a prototype', 'Claude Code', 'Build a working prototype of [IDEA]. Scope: one core flow, end to end, with seeded demo data. No auth, no settings. Prioritize something we can demo live in two minutes.', 5),
  ('Build the pitch deck', 'Gamma', 'Create a 6-slide pitch deck: problem, who has it, our solution, live demo placeholder, why now, the ask. Problem statement: [PASTE]. Keep each slide to one idea.', 6),
  ('Tighten the pitch', 'Claude', 'Here is our 5-minute pitch script: [PASTE]. Cut it to fit 3 minutes of talking plus a 2-minute demo. Keep the strongest hook, remove jargon, and end on a clear ask.', 7);

INSERT INTO tools (name, description, url, sort) VALUES
  ('Claude', 'Thinking partner for defining the problem, drafting copy, and tightening the pitch.', 'https://claude.ai', 1),
  ('Claude Code', 'Agentic coding tool for building the prototype quickly.', 'https://claude.com/claude-code', 2),
  ('NotebookLM', 'Upload sources and get cited research summaries and speaker notes.', 'https://notebooklm.google.com', 3),
  ('Stitch', 'Generate UI screens from a text description.', 'https://stitch.withgoogle.com', 4),
  ('Gamma', 'Generate a pitch deck from an outline.', 'https://gamma.app', 5);
