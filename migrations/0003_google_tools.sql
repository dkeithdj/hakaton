-- Participants are mostly students, so lead with Google tools that have a free tier.
UPDATE tools SET sort = sort + 10 WHERE name IN ('Claude', 'Claude Code', 'Gamma');
UPDATE tools SET sort = 3 WHERE name = 'NotebookLM';
UPDATE tools SET sort = 4 WHERE name = 'Stitch';

INSERT INTO tools (name, description, url, sort) VALUES
  ('Gemini', 'Google''s AI assistant. Free with a Google account. Use it to define the problem, brainstorm, and draft your pitch.', 'https://gemini.google.com', 1),
  ('Google AI Studio', 'Free playground for Gemini models. Describe an app and it builds a working prototype you can share.', 'https://aistudio.google.com', 2),
  ('Antigravity', 'Google''s agentic coding editor. Good for building a fuller prototype on your laptop.', 'https://antigravity.google', 5),
  ('Firebase Studio', 'Browser-based workspace that generates and hosts a full-stack app from a prompt.', 'https://firebase.studio', 6),
  ('Gemini CLI', 'Gemini as a coding agent in your terminal, with a free tier.', 'https://github.com/google-gemini/gemini-cli', 7),
  ('Google Slides', 'Build the pitch deck together in real time. Gemini in Slides can draft slides and images.', 'https://slides.google.com', 8);

UPDATE prompts SET tool = 'Gemini' WHERE tool = 'Claude';
UPDATE prompts SET tool = 'Google AI Studio or Antigravity' WHERE tool = 'Claude Code';
UPDATE prompts SET tool = 'Google Slides or Gamma' WHERE tool = 'Gamma';
