# Graph Report - hakaton  (2026-10-11)

## Corpus Check
- 52 files · ~24,203 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 436 nodes · 915 edges · 25 communities (18 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2402e370`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- event.tsx
- Admin.tsx
- PitchTimer
- index.ts
- package.json
- components.json
- 0001_init.sql
- Participant.tsx
- devDependencies
- dependencies
- compilerOptions
- alert-dialog.tsx
- compilerOptions
- Hakaton
- api.test.ts
- Hakaton
- tsconfig.json
- 0005_materials.sql
- pre-commit
- scripts

## God Nodes (most connected - your core abstractions)
1. `react` - 24 edges
2. `api()` - 20 edges
3. `cn` - 16 edges
4. `errorMessage()` - 16 edges
5. `scripts` - 13 edges
6. `compilerOptions` - 13 edges
7. `radix-ui` - 12 edges
8. `getPhase()` - 11 edges
9. `Button()` - 11 edges
10. `formatDuration()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Layout` --references--> `ApiError`  [INFERRED]
  CLAUDE.md → src/lib/api.ts
- `Layout` --references--> `api()`  [INFERRED]
  CLAUDE.md → src/lib/api.ts
- `Layout` --references--> `useEventState()`  [INFERRED]
  CLAUDE.md → src/lib/api.ts
- `Layout` --references--> `Admin()`  [INFERRED]
  CLAUDE.md → src/pages/Admin.tsx
- `Layout` --references--> `Participant()`  [INFERRED]
  CLAUDE.md → src/pages/Participant.tsx

## Import Cycles
- None detected.

## Communities (25 total, 7 thin omitted)

### Community 0 - "event.tsx"
Cohesion: 0.06
Nodes (48): Layout, react-dom, react-router-dom, @tanstack/react-query, @testing-library/react, @testing-library/user-event, EventState, getPhase() (+40 more)

### Community 1 - "Admin.tsx"
Cohesion: 0.08
Nodes (37): cn, react, sonner, ConfirmButton(), PRESETS, EditorField, fromFormValue(), Item (+29 more)

### Community 2 - "PitchTimer"
Cohesion: 0.67
Nodes (3): beep(), PitchTimer(), start()

### Community 3 - "index.ts"
Cohesion: 0.06
Nodes (58): Architecture, AdminTeam, Material, Me, Milestone, Phase, Prompt, ScheduleItem (+50 more)

### Community 4 - "package.json"
Cohesion: 0.07
Nodes (30): allowScripts, esbuild@0.28.1, esbuild@0.28.2, workerd@1.20260815.1, workerd@1.20261006.1, name, private, type (+22 more)

### Community 5 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "0001_init.sql"
Cohesion: 0.27
Nodes (10): ballots, prompts, ratings, schedule_items, settings, teams, tools, topics (+2 more)

### Community 7 - "Participant.tsx"
Cohesion: 0.08
Nodes (28): class-variance-authority, lucide-react, radix-ui, UPLOAD_LIMITS, LoginCard(), KIND_LABELS, TeamUploads(), uploadFile() (+20 more)

### Community 8 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, @cloudflare/vite-plugin, @cloudflare/vitest-pool-workers, jsdom, tailwindcss, @tailwindcss/vite, @testing-library/react, @testing-library/user-event (+8 more)

### Community 9 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, class-variance-authority, cn, @fontsource-variable/geist, hono, lucide-react, qrcode.react, radix-ui (+7 more)

### Community 10 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, jsx, lib, module, moduleResolution, noEmit, paths, skipLibCheck (+6 more)

### Community 11 - "alert-dialog.tsx"
Cohesion: 0.24
Nodes (9): AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogTitle() (+1 more)

### Community 12 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 13 - "Hakaton"
Cohesion: 0.17
Nodes (11): Admin page, Deploying to Cloudflare, Hakaton, How voting works, Local development, Pages, Participant page, Running it (+3 more)

### Community 14 - "api.test.ts"
Cohesion: 0.35
Nodes (6): ref_cloudflare_test, adminClient(), Client, createTeams(), teamClient(), app

### Community 15 - "Hakaton"
Cohesion: 0.40
Nodes (4): Commands, Conventions, graphify, Hakaton

### Community 16 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, files, references

### Community 24 - "scripts"
Cohesion: 0.15
Nodes (13): scripts, build, ci:build, ci:deploy, db:migrate:local, db:migrate:remote, deploy, dev (+5 more)

## Knowledge Gaps
- **143 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+138 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 191 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Admin.tsx` to `event.tsx`, `alert-dialog.tsx`, `package.json`, `Participant.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _143 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `event.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06436487638533675 - nodes in this community are weakly interconnected._
- **Should `Admin.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05879692446856626 - nodes in this community are weakly interconnected._