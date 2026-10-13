-- Each team names what it built, so voters and judges can tell the projects apart.
ALTER TABLE teams ADD COLUMN project_title TEXT NOT NULL DEFAULT '';
