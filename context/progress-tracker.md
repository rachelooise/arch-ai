# Progress Tracker

Update this file after every meaningful implementation change.
Group completed work by feature in a numbered list, including implementation and verification details for each feature.

## Current Phase

- Feature 09: Share Dialog complete

## Current Goal

- Completed Feature 09: workspace share dialog, owner-managed collaborators, read-only collaborator access, Clerk profile enrichment, and copy-link feedback.

## Completed

1. **Feature 01: Design System** — Cleaned up the boilerplate and initialized shadcn/ui (Radix Nova) with Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea, and Lucide React. Implemented the specified dark palette, Tailwind and shadcn tokens, Geist typography, and global primitive radius styling while preserving generated UI files. Added `lib/utils.ts` to re-export the CLI's `cn()` helper. Verified all seven component imports and server renders, class merging and conditional inputs, dark-only theme configuration, ESLint, TypeScript, and the production build.

2. **Feature 02: Editor Chrome** — Built the fixed-height navbar with left, center, and empty right sections and state-aware PanelLeft icons. Added the floating, sliding project sidebar with a Projects header, close action, empty My Projects and Shared tabs, and a full-width New Project placeholder button. Mounted the reusable editor shell in `app/layout.tsx` so the navbar and sidebar frame page children, preserve shared state across navigation, and overlay the canvas without shifting its layout. Prepared token-based dialog title, description, and footer styling and documented composition in `ui-context.md` without creating actual dialogs. Passed ESLint, `tsc --noEmit`, the production build, and diff whitespace checks; browser interaction checks were not run.

3. **Feature 03: Authentication** — Installed `@clerk/ui` and wrapped the root layout with `ClerkProvider`, using its dark theme and existing CSS tokens for appearance. Added compact responsive sign-in/sign-up pages with catch-all Clerk routes and Suspense boundaries for Cache Components. Added root `proxy.ts` to protect application and API routes by default, exposing only the auth paths and their nested flows (static assets bypass the proxy). Redirected `/` by session state and set post-auth fallback to `/editor`. Mounted the persistent editor shell in `app/editor/layout.tsx` and added the default Clerk `UserButton` for profile and logout. Passed ESLint, TypeScript, `npm run build`, and diff whitespace checks. HTTP checks confirmed public auth pages return 200 and unauthenticated requests to `/`, `/editor`, `/sign-in-other`, and an API path redirect to sign-in. Browser sign-in, profile, and logout flows were not exercised.

4. **Auth UI refinement** — Updated both auth pages to explicit equal-width desktop columns with minimum-width constraints. Added a solid cyan-tinted left panel derived from existing CSS palette variables, using compact branding and a text-only feature list; retained the centered dark form panel and form-only mobile layout. Applied the loaded Geist Sans font directly to the body and explicitly configured Clerk text and buttons with Geist Sans and code with Geist Mono. Production build and ESLint passed; browser visual checks were not run.

5. **Feature 04: Project Dialogs** - Added the minimal centered editor home with the specified copy and Plus button. Added a dedicated hook for dialog, form, loading, and in-memory mock project state. Wired both create buttons and owned-project rename/delete actions; shared projects hide actions. Create includes a live slug preview, rename includes the current name and an auto-focused input with Enter submission, and delete is an input-free destructive confirmation. Added a mobile sidebar scrim that closes on outside taps. Passed ESLint, TypeScript, production build, and diff whitespace checks. Browser interaction checks were not run. No API calls or persistence were added.

6. **Feature 05: Prisma** - Added `prisma/models/project.prisma` with Project, ProjectStatus, and ProjectCollaborator, including the Clerk owner ID, optional description and canvas path, timestamps, cascade deletion, project/email uniqueness, and requested indexes. Added multi-file schema configuration and `lib/prisma.ts` with Accelerate URL branching, direct PostgreSQL adapter support, and a development global singleton. Created and applied `20261010062450_init_projects` to the configured database. Schema validation, client generation, TypeScript, ESLint, and production build passed. Read-only queries through both models, live database index and cascade metadata checks, and singleton reuse after module reload passed. Hosted Accelerate queries were not verified.

7. **Feature 06: Project APIs** - Added GET/POST `/api/projects` and PATCH/DELETE `/api/projects/[projectId]`. Lists filter by the authenticated Clerk owner and sort newest first. Creation defaults missing names to `Untitled Project`, preserves schema-generated IDs, and ignores client-supplied ownership. Rename/delete check ownership and include it in mutation filters; signed-out requests return JSON 401, non-owners receive 403, missing projects receive 404, and invalid names/JSON receive 400. Updated the proxy for project API 401 responses while retaining editor sign-in redirects. Corrected the singleton's shared query type for direct and Accelerate transports. All 26 isolated route tests, TypeScript, ESLint, production build, and diff whitespace checks passed. Production HTTP checks confirmed JSON 401 without redirects for all four endpoints and retained editor redirects. Signed-in CRUD and 403 behavior were tested with mocked Clerk/database dependencies; a live signed-in Clerk session was not exercised. No UI integration was added.

8. **Feature 07: Wire Editor Home** - Converted the editor home to a Server Component with a small client create button. Added the missing server-only project data helper and loaded owned/shared lists in the shared editor server layout, passing both lists to the sidebar without client-side initial fetching. Shared access matches verified Clerk emails case-insensitively and excludes owned projects. Replaced the mock dialog hook with `useProjectActions`, including stable per-dialog random suffixes, slugified room ID previews, API mutations, loading/duplicate-submission guards, and visible errors. Creation persists the validated room ID as the project ID and navigates to `/editor/[projectId]`; legacy requests without a room ID retain schema-generated IDs and collisions return 409. Rename refreshes without changing the room ID; delete redirects home for the active workspace and otherwise refreshes. Added sidebar workspace links and a minimal workspace destination with owner/collaborator access checks and a room ID equal to the project ID. All 48 project API/data/mutation tests, TypeScript, ESLint, production build, and diff whitespace checks passed. Tests mock Clerk, database, fetch, and navigation boundaries; live signed-in browser interaction was not exercised. Liveblocks runtime/canvas integration remains for a later feature.

9. **Feature 08: Editor Workspace Shell** - Renamed the workspace route to `/editor/[roomId]` and retained its Server Component access check. Added server-only `lib/project-access.ts` for the Clerk user ID/primary email and owner-or-collaborator access, and aligned shared-project lists with that primary-email rule. Signed-out users redirect to `/sign-in`; missing and unauthorized rooms render the same centered `AccessDenied` component with a lock icon, short message, and link back to `/editor`. Extended the full-viewport editor shell with the project name in the navbar, a disabled share placeholder, an accessible AI sidebar toggle, current-room sidebar highlighting and automatic selection of the shared tab when appropriate, a dark centered canvas placeholder, and a right AI placeholder that can be shown/hidden. All 62 project/workspace tests, TypeScript, ESLint, production build, and diff whitespace checks passed. Access and shell tests mock Clerk/database/router boundaries and verify rendered markup; live signed-in browser interaction was not exercised. No canvas, Liveblocks, AI chat, or sharing behavior was added.

10. **Feature 09: Share Dialog** - Enabled the workspace navbar Share button and added a dialog that loads current collaborator data and server-reported permissions on open. Owners can invite by email, remove collaborators, and copy the canonical project link with temporary two-second `Copied!` feedback; collaborators see the list without management or copy controls. Added authenticated GET/POST `/api/projects/[projectId]/collaborators` and DELETE `/api/projects/[projectId]/collaborators/[collaboratorId]`, enforcing owner-only mutations and owner/collaborator list access on the server. Invitations normalize email case, validate input, and reject duplicates; deletion is scoped to both project and owner. Clerk Backend API lookups enrich email rows with display names and avatars, with email-only fallback for missing users or unavailable enrichment. Added loading/error/retry states, mutation guards, and fetch/timer cleanup. No local user table or schema change was added. All 95 project/workspace/sharing tests, TypeScript, ESLint, production build, and diff whitespace checks passed. Tests use mocked Clerk/database/browser boundaries; live Clerk profile lookups and signed-in browser interactions were not exercised.

## In Progress

- None.

## Next Up

- Await the next feature specification.

## Open Questions

- None.

## Architecture Decisions

- Use generated shadcn/ui components without modifying `components/ui/*`.
- Define the dark-only palette in global CSS and map it to Tailwind and shadcn semantic tokens.
- Use the current CLI's `cn` package via `lib/utils.ts` so application code and generated components share the same class-merging behavior.
- Keep sidebar visibility in `EditorShell`; position the sidebar absolutely above the canvas and make its closed contents inert.
- Compose future dialogs from existing shadcn primitives using global token styling.

## Session Notes

- Feature 08: workspace routes use `[roomId]` while retaining the same URL shape and project/room ID alignment. Project access and shared lists now use Clerk's primary email through the shared server-only access helper.
- Feature 05: pinned Prisma CLI, client, and PostgreSQL adapter to 7.10.0 because the specified Accelerate integration is unsupported by Prisma 8. Prisma CLI loads the existing `.env.local` using `@next/env`; the production build generates the ignored client automatically. The configured direct PostgreSQL connection was verified. A synthetic Accelerate URL was rejected as an invalid API key; hosted Accelerate queries require real credentials and were not verified.
- Feature 04 readability fix: explicitly applied the primary text and caret colors to the project name input and retained full text opacity while saving, keeping create and rename values readable on the dark background.
- The dark palette from `ui-context.md` is implemented in `app/globals.css`; the root layout enables dark variants and CSS uses `color-scheme: dark`.
- Generated `components/ui/*` files were not edited after installation.
- Production builds fetch Geist fonts and need access to Google Fonts. The build passed with network access.
- The editor sidebar starts closed. Feature 07 replaced mock project state with server-loaded database lists and persistent API mutations; initial data is fetched in the shared server layout so home and workspace pages share the sidebar.
- Browser interaction checks were not run; static checks and production compilation passed.
- Feature 03 review fix: pinned the shared auth URLs to `/sign-in` and `/sign-up`, matching the implemented pages. Removed environment overrides that could point Clerk and public route protection at nonexistent custom paths.
- Feature 03 layout review: moved `ClerkProvider` inside `<body>` around page children, preserving all provider options and root font classes. Production build passed.
