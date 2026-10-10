-- Each team signs in with its own password. Existing teams get a random one.
ALTER TABLE teams ADD COLUMN password TEXT NOT NULL DEFAULT '';
UPDATE teams SET password = lower(hex(randomblob(3))) WHERE password = '';
