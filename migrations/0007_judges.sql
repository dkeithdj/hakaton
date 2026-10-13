-- The admin adds judges; a judge signs in at /judge by typing their name.
-- The after-event purge blanks the name, which is why blank names are left out of the unique index.
CREATE TABLE judges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL COLLATE NOCASE,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX judges_name ON judges(name) WHERE name <> '';

-- One judge's points for one team. The three criteria add up to 100.
CREATE TABLE judge_scores (
  judge_id INTEGER NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  pitch REAL NOT NULL CHECK (pitch BETWEEN 0 AND 25),
  demo REAL NOT NULL CHECK (demo BETWEEN 0 AND 40),
  impact REAL NOT NULL CHECK (impact BETWEEN 0 AND 35),
  PRIMARY KEY (judge_id, team_id)
);
