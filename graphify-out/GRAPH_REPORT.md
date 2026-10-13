# Graph Report - hakaton  (2026-10-13)

## Corpus Check
- 59 files · ~33,584 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 498 nodes · 1093 edges · 30 communities (21 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `63e6f143`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pages.test.tsx
- Participant.tsx
- Admin.tsx
- index.ts
- package.json
- components.json
- 0001_init.sql
- event.tsx
- devDependencies
- dependencies
- compilerOptions
- Judge.tsx
- compilerOptions
- Hakaton
- api.test.ts
- alert-dialog.tsx
- tsconfig.json
- 0005_materials.sql
- pre-commit
- scripts
- vitest
- allowScripts
- @cloudflare/vitest-pool-workers

## God Nodes (most connected - your core abstractions)
1. `react` - 26 edges
2. `api()` - 24 edges
3. `errorMessage()` - 19 edges
4. `cn` - 17 edges
5. `scripts` - 15 edges
6. `useEventState()` - 14 edges
7. `radix-ui` - 13 edges
8. `useNow()` - 13 edges
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

## Communities (30 total, 9 thin omitted)

### Community 0 - "pages.test.tsx"
Cohesion: 0.07
Nodes (43): Layout, react-router-dom, sonner, @tanstack/react-query, @testing-library/user-event, EventState, Me, PublicSettings (+35 more)

### Community 1 - "Participant.tsx"
Cohesion: 0.05
Nodes (46): class-variance-authority, cn, lucide-react, radix-ui, react, SGD_URL, beep(), PitchTimer() (+38 more)

### Community 2 - "Admin.tsx"
Cohesion: 0.11
Nodes (32): AdminTeam, AUDIENCE_MAX_RATING, AUDIENCE_WEIGHT, Judge, JUDGE_WEIGHT, JudgeCriterion, JudgeScore, JudgeSession (+24 more)

### Community 3 - "index.ts"
Cohesion: 0.06
Nodes (51): Architecture, Commands, Conventions, graphify, Hakaton, hono, finalScore(), UploadKind (+43 more)

### Community 4 - "package.json"
Cohesion: 0.12
Nodes (16): name, private, type, version, @fontsource-variable/geist, jsdom, react-dom, shadcn (+8 more)

### Community 5 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "0001_init.sql"
Cohesion: 0.20
Nodes (13): ballots, prompts, ratings, schedule_items, settings, teams, tools, topics (+5 more)

### Community 7 - "event.tsx"
Cohesion: 0.12
Nodes (28): qrcode.react, getPhase(), EventLogo(), FullPageMessage(), hackRemainingMs(), HackTimer(), PageShell(), PHASE_LABELS (+20 more)

### Community 8 - "devDependencies"
Cohesion: 0.12
Nodes (16): devDependencies, @cloudflare/vite-plugin, @cloudflare/vitest-pool-workers, jsdom, tailwindcss, @tailwindcss/vite, @testing-library/react, @testing-library/user-event (+8 more)

### Community 9 - "dependencies"
Cohesion: 0.13
Nodes (15): dependencies, class-variance-authority, cn, @fontsource-variable/geist, hono, lucide-react, qrcode.react, radix-ui (+7 more)

### Community 10 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, jsx, lib, module, moduleResolution, noEmit, paths, skipLibCheck (+6 more)

### Community 11 - "Judge.tsx"
Cohesion: 0.17
Nodes (18): CriteriaScores, JUDGE_CRITERIA, JUDGE_MAX_SCORE, Team, Card(), CardContent(), CardDescription(), CardHeader() (+10 more)

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

### Community 29 - "vitest"
Cohesion: 0.28
Nodes (6): @cloudflare/vite-plugin, ref_node_path, @tailwindcss/vite, vite, @vitejs/plugin-react, vitest

### Community 30 - "allowScripts"
Cohesion: 0.40
Nodes (5): allowScripts, esbuild@0.28.1, esbuild@0.28.2, workerd@1.20260815.1, workerd@1.20261006.1

### Community 31 - "@cloudflare/vitest-pool-workers"
Cohesion: 0.50
Nodes (3): @cloudflare/vitest-pool-workers, Cloudflare, Env

## Knowledge Gaps
- **152 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+147 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 205 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Participant.tsx` to `pages.test.tsx`, `Admin.tsx`, `package.json`, `event.tsx`, `Judge.tsx`, `alert-dialog.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _152 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pages.test.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07080200501253132 - nodes in this community are weakly interconnected._
- **Should `Participant.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05160662122687439 - nodes in this community are weakly interconnected._
- **Should `Admin.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10756302521008404 - nodes in this community are weakly interconnected._