-- Topics become the 17 Sustainable Development Goals, each with its official color.
-- A team starts from one or more goals, so the single topic_id gives way to a list.
-- topic_id stays behind unused: SQLite cannot drop a column that carries a foreign key.
ALTER TABLE topics ADD COLUMN color TEXT NOT NULL DEFAULT '';
ALTER TABLE teams ADD COLUMN topic_ids TEXT NOT NULL DEFAULT '[]';

DELETE FROM topics;
INSERT INTO topics (title, description, color, sort) VALUES
  ('No Poverty', 'End poverty in all its forms everywhere.', '#E5243B', 1),
  ('Zero Hunger', 'End hunger, achieve food security and improved nutrition, and promote sustainable agriculture.', '#DDA63A', 2),
  ('Good Health and Well-being', 'Ensure healthy lives and promote well-being for all at all ages.', '#4C9F38', 3),
  ('Quality Education', 'Ensure inclusive and equitable quality education and promote lifelong learning for all.', '#C5192D', 4),
  ('Gender Equality', 'Achieve gender equality and empower all women and girls.', '#FF3A21', 5),
  ('Clean Water and Sanitation', 'Ensure availability and sustainable management of water and sanitation for all.', '#26BDE2', 6),
  ('Affordable and Clean Energy', 'Ensure access to affordable, reliable, sustainable, and modern energy for all.', '#FCC30B', 7),
  ('Decent Work and Economic Growth', 'Promote sustained, inclusive economic growth and decent work for all.', '#A21942', 8),
  ('Industry, Innovation and Infrastructure', 'Build resilient infrastructure, promote inclusive industrialization, and foster innovation.', '#FD6925', 9),
  ('Reduced Inequalities', 'Reduce inequality within and among countries.', '#DD1367', 10),
  ('Sustainable Cities and Communities', 'Make cities and human settlements inclusive, safe, resilient, and sustainable.', '#FD9D24', 11),
  ('Responsible Consumption and Production', 'Ensure sustainable consumption and production patterns.', '#BF8B2E', 12),
  ('Climate Action', 'Take urgent action to combat climate change and its impacts.', '#3F7E44', 13),
  ('Life Below Water', 'Conserve and sustainably use the oceans, seas, and marine resources.', '#0A97D9', 14),
  ('Life on Land', 'Protect and restore ecosystems, manage forests sustainably, and halt biodiversity loss.', '#56C02B', 15),
  ('Peace, Justice and Strong Institutions', 'Promote peaceful and inclusive societies, access to justice, and accountable institutions.', '#00689D', 16),
  ('Partnerships for the Goals', 'Strengthen the means of implementation and revitalize the global partnership for sustainable development.', '#19486A', 17);

-- Every tool gets its own color, and a vendor so the Google tools can be shown first.
ALTER TABLE tools ADD COLUMN vendor TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN color TEXT NOT NULL DEFAULT '';

UPDATE tools SET vendor = 'Google' WHERE name IN
  ('Gemini', 'Google AI Studio', 'NotebookLM', 'Stitch', 'Antigravity', 'Firebase Studio', 'Gemini CLI', 'Google Slides');
UPDATE tools SET vendor = 'Anthropic' WHERE name IN ('Claude', 'Claude Code');
UPDATE tools SET vendor = 'Gamma' WHERE name = 'Gamma';

UPDATE tools SET color = '#4285F4' WHERE name = 'Gemini';
UPDATE tools SET color = '#EA4335' WHERE name = 'Google AI Studio';
UPDATE tools SET color = '#34A853' WHERE name = 'NotebookLM';
UPDATE tools SET color = '#E91E63' WHERE name = 'Stitch';
UPDATE tools SET color = '#7C4DFF' WHERE name = 'Antigravity';
UPDATE tools SET color = '#FF9100' WHERE name = 'Firebase Studio';
UPDATE tools SET color = '#00ACC1' WHERE name = 'Gemini CLI';
UPDATE tools SET color = '#F9AB00' WHERE name = 'Google Slides';
UPDATE tools SET color = '#D97757' WHERE name = 'Claude';
UPDATE tools SET color = '#B5532F' WHERE name = 'Claude Code';
UPDATE tools SET color = '#6B46FE' WHERE name = 'Gamma';
