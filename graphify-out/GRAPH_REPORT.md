# Graph Report - hakaton  (2026-10-13)

## Corpus Check
- 60 files · ~36,185 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 506 nodes · 1105 edges · 33 communities (23 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fbe9bd2f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pages.test.tsx
- Admin.tsx
- event.tsx
- index.ts
- package.json
- components.json
- 0001_init.sql
- Judge.tsx
- devDependencies
- dependencies
- compilerOptions
- AdminData
- compilerOptions
- Hakaton
- api.test.ts
- alert-dialog.tsx
- tsconfig.json
- 0005_materials.sql
- pre-commit
- scripts
- Participant.tsx
- resources.ts
- Hakaton
- bad
- settings.ts

## God Nodes (most connected - your core abstractions)
1. `react` - 26 edges
2. `api()` - 25 edges
3. `errorMessage()` - 19 edges
4. `cn` - 17 edges
5. `scripts` - 15 edges
6. `useEventState()` - 14 edges
7. `useNow()` - 14 edges
8. `radix-ui` - 13 edges
9. `compilerOptions` - 13 edges
10. `Button()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Architecture` --references--> `finalScore()`  [INFERRED]
  CLAUDE.md → shared/types.ts
- `Layout` --references--> `ApiError`  [INFERRED]
  CLAUDE.md → src/lib/api.ts
- `Layout` --references--> `api()`  [INFERRED]
  CLAUDE.md → src/lib/api.ts
- `Layout` --references--> `useEventState()`  [INFERRED]
  CLAUDE.md → src/lib/api.ts
- `Layout` --references--> `Admin()`  [INFERRED]
  CLAUDE.md → src/pages/Admin.tsx

## Import Cycles
- None detected.

## Communities (33 total, 10 thin omitted)

### Community 0 - "pages.test.tsx"
Cohesion: 0.08
Nodes (43): Layout, @tanstack/react-query, @testing-library/react, @testing-library/user-event, EventState, Me, Role, UPLOAD_LIMITS (+35 more)

### Community 1 - "Admin.tsx"
Cohesion: 0.07
Nodes (35): lucide-react, sonner, judgeTotal(), Milestone, EditorField, fromFormValue(), Item, ResourceEditor() (+27 more)

### Community 2 - "event.tsx"
Cohesion: 0.07
Nodes (43): qrcode.react, AdminTeam, AUDIENCE_MAX_RATING, AUDIENCE_WEIGHT, getPhase(), JUDGE_MAX_SCORE, JUDGE_WEIGHT, JudgeCriterion (+35 more)

### Community 3 - "index.ts"
Cohesion: 0.10
Nodes (15): hono, finalScore(), JUDGE_CRITERIA, JudgeSession, UPLOAD_PART_SIZE, UploadKind, admin, AppContext (+7 more)

### Community 4 - "package.json"
Cohesion: 0.07
Nodes (29): allowScripts, esbuild@0.28.1, esbuild@0.28.2, workerd@1.20260815.1, workerd@1.20261006.1, name, private, type (+21 more)

### Community 5 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "0001_init.sql"
Cohesion: 0.20
Nodes (13): ballots, prompts, ratings, schedule_items, settings, teams, tools, topics (+5 more)

### Community 7 - "Judge.tsx"
Cohesion: 0.13
Nodes (24): class-variance-authority, cn, radix-ui, react, react-router-dom, Badge(), badgeVariants, Button() (+16 more)

### Community 8 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, @cloudflare/vite-plugin, @cloudflare/vitest-pool-workers, jsdom, tailwindcss, @tailwindcss/vite, @testing-library/react, @testing-library/user-event (+8 more)

### Community 9 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, class-variance-authority, cn, @fontsource-variable/geist, hono, lucide-react, qrcode.react, radix-ui (+7 more)

### Community 10 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, jsx, lib, module, moduleResolution, noEmit, paths, skipLibCheck (+6 more)

### Community 11 - "AdminData"
Cohesion: 0.25
Nodes (8): CriteriaScores, Judge, JudgeScore, Material, Prompt, Tool, Upload, AdminData

### Community 12 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 13 - "Hakaton"
Cohesion: 0.12
Nodes (15): Admin page, Deploying to Cloudflare, Hakaton, How judging and the final score work, How voting works, Judge page, Local development, Pages (+7 more)

### Community 14 - "api.test.ts"
Cohesion: 0.32
Nodes (8): ref_cloudflare_test, adminClient(), Client, createTeams(), judgeClient(), points(), teamClient(), app

### Community 15 - "alert-dialog.tsx"
Cohesion: 0.22
Nodes (10): ConfirmButton(), AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader() (+2 more)

### Community 16 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, files, references

### Community 24 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, ci:build, ci:deploy, db:migrate:local, db:migrate:remote, db:seed:local, db:seed:remote (+7 more)

### Community 28 - "Participant.tsx"
Cohesion: 0.09
Nodes (16): SGD_URL, Checkbox(), Collapsible(), CollapsibleContent(), CollapsibleTrigger(), Dialog(), DialogContent(), DialogDescription() (+8 more)

### Community 29 - "resources.ts"
Cohesion: 0.22
Nodes (16): assignments(), bad(), createResource(), Field, FieldType, fromRow(), isInt(), listResource() (+8 more)

### Community 30 - "Hakaton"
Cohesion: 0.20
Nodes (9): Architecture, Commands, Conventions, graphify, Hakaton, assertTeamAccess(), getSession(), passwordTag() (+1 more)

### Community 31 - "bad"
Cohesion: 0.25
Nodes (9): bad(), generateTeamPassword(), getUploadRow(), idParam(), readJson(), rejectDuplicate(), resourceParam(), withTeamPassword() (+1 more)

### Community 32 - "settings.ts"
Cohesion: 0.38
Nodes (6): Settings, DEFAULT_SETTINGS, getSettings(), mergeSettings(), saveSettings(), settingsStatements()

## Knowledge Gaps
- **153 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+148 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 209 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Judge.tsx` to `pages.test.tsx`, `Admin.tsx`, `event.tsx`, `package.json`, `alert-dialog.tsx`, `Participant.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _153 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pages.test.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07518796992481203 - nodes in this community are weakly interconnected._
- **Should `Admin.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07397959183673469 - nodes in this community are weakly interconnected._
- **Should `event.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07329462989840348 - nodes in this community are weakly interconnected._