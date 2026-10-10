# Graph Report - hackathon  (2026-10-10)

## Corpus Check
- 51 files · ~18,927 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .example 1, (none) 1, .css 1)

## Summary
- 430 nodes · 909 edges · 23 communities (17 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- api.ts
- Participant.tsx
- event.tsx
- Admin.tsx
- package.json
- components.json
- 0001_init.sql
- resources.ts
- devDependencies
- dependencies
- compilerOptions
- alert-dialog.tsx
- compilerOptions
- Hackathon
- api.test.ts
- Hackathon
- tsconfig.json
- 0005_materials.sql

## God Nodes (most connected - your core abstractions)
1. `react` - 24 edges
2. `api()` - 20 edges
3. `cn` - 16 edges
4. `errorMessage()` - 16 edges
5. `compilerOptions` - 13 edges
6. `radix-ui` - 12 edges
7. `getPhase()` - 11 edges
8. `Button()` - 11 edges
9. `formatDuration()` - 11 edges
10. `compilerOptions` - 11 edges

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

## Communities (23 total, 6 thin omitted)

### Community 0 - "api.ts"
Cohesion: 0.08
Nodes (38): Layout, react-dom, react-router-dom, sonner, @tanstack/react-query, @testing-library/react, @testing-library/user-event, getPhase() (+30 more)

### Community 1 - "Participant.tsx"
Cohesion: 0.06
Nodes (48): class-variance-authority, cn, lucide-react, radix-ui, react, LoginCard(), beep(), PitchTimer() (+40 more)

### Community 2 - "event.tsx"
Cohesion: 0.12
Nodes (21): qrcode.react, EventState, Phase, ScheduleItem, FullPageMessage(), hackRemainingMs(), HackTimer(), PHASE_LABELS (+13 more)

### Community 3 - "Admin.tsx"
Cohesion: 0.07
Nodes (49): Architecture, AdminTeam, Material, Me, Milestone, Prompt, PublicSettings, Settings (+41 more)

### Community 4 - "package.json"
Cohesion: 0.05
Nodes (39): allowScripts, esbuild@0.28.1, esbuild@0.28.2, workerd@1.20260815.1, workerd@1.20261006.1, name, private, scripts (+31 more)

### Community 5 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 6 - "0001_init.sql"
Cohesion: 0.27
Nodes (10): ballots, prompts, ratings, schedule_items, settings, teams, tools, topics (+2 more)

### Community 7 - "resources.ts"
Cohesion: 0.20
Nodes (17): assignments(), bad(), createResource(), deleteResource(), Field, FieldType, fromRow(), isInt() (+9 more)

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
Cohesion: 0.22
Nodes (10): ConfirmButton(), AlertDialog(), AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader() (+2 more)

### Community 12 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 13 - "Hackathon"
Cohesion: 0.17
Nodes (11): Admin page, Deploying to Cloudflare, Hackathon, How voting works, Local development, Pages, Participant page, Running it (+3 more)

### Community 14 - "api.test.ts"
Cohesion: 0.35
Nodes (6): ref_cloudflare_test, adminClient(), Client, createTeams(), teamClient(), app

### Community 15 - "Hackathon"
Cohesion: 0.40
Nodes (4): Commands, Conventions, graphify, Hackathon

### Community 16 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): compilerOptions, paths, files, references

## Knowledge Gaps
- **140 isolated node(s):** `$schema`, `style`, `rsc`, `tsx`, `config` (+135 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 186 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Participant.tsx` to `api.ts`, `event.tsx`, `Admin.tsx`, `package.json`, `alert-dialog.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `$schema`, `style`, `rsc` to the rest of the system?**
  _140 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08220211161387632 - nodes in this community are weakly interconnected._
- **Should `Participant.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.056790123456790124 - nodes in this community are weakly interconnected._
- **Should `event.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1164021164021164 - nodes in this community are weakly interconnected._