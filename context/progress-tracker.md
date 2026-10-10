# Progress Tracker

Update this file after every meaningful implementation change.
Group completed work by feature in a numbered list, including implementation and verification details for each feature.

## Current Phase

- Feature 04: Project dialogs complete

## Current Goal

- Completed Feature 04: editor home, mock project dialogs, owned-project actions, and mobile sidebar dismissal.

## Completed

1. **Feature 01: Design System** — Cleaned up the boilerplate and initialized shadcn/ui (Radix Nova) with Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea, and Lucide React. Implemented the specified dark palette, Tailwind and shadcn tokens, Geist typography, and global primitive radius styling while preserving generated UI files. Added `lib/utils.ts` to re-export the CLI's `cn()` helper. Verified all seven component imports and server renders, class merging and conditional inputs, dark-only theme configuration, ESLint, TypeScript, and the production build.

2. **Feature 02: Editor Chrome** — Built the fixed-height navbar with left, center, and empty right sections and state-aware PanelLeft icons. Added the floating, sliding project sidebar with a Projects header, close action, empty My Projects and Shared tabs, and a full-width New Project placeholder button. Mounted the reusable editor shell in `app/layout.tsx` so the navbar and sidebar frame page children, preserve shared state across navigation, and overlay the canvas without shifting its layout. Prepared token-based dialog title, description, and footer styling and documented composition in `ui-context.md` without creating actual dialogs. Passed ESLint, `tsc --noEmit`, the production build, and diff whitespace checks; browser interaction checks were not run.

3. **Feature 03: Authentication** — Installed `@clerk/ui` and wrapped the root layout with `ClerkProvider`, using its dark theme and existing CSS tokens for appearance. Added compact responsive sign-in/sign-up pages with catch-all Clerk routes and Suspense boundaries for Cache Components. Added root `proxy.ts` to protect application and API routes by default, exposing only the auth paths and their nested flows (static assets bypass the proxy). Redirected `/` by session state and set post-auth fallback to `/editor`. Mounted the persistent editor shell in `app/editor/layout.tsx` and added the default Clerk `UserButton` for profile and logout. Passed ESLint, TypeScript, `npm run build`, and diff whitespace checks. HTTP checks confirmed public auth pages return 200 and unauthenticated requests to `/`, `/editor`, `/sign-in-other`, and an API path redirect to sign-in. Browser sign-in, profile, and logout flows were not exercised.

4. **Auth UI refinement** — Updated both auth pages to explicit equal-width desktop columns with minimum-width constraints. Added a solid cyan-tinted left panel derived from existing CSS palette variables, using compact branding and a text-only feature list; retained the centered dark form panel and form-only mobile layout. Applied the loaded Geist Sans font directly to the body and explicitly configured Clerk text and buttons with Geist Sans and code with Geist Mono. Production build and ESLint passed; browser visual checks were not run.

5. **Feature 04: Project Dialogs** - Added the minimal centered editor home with the specified copy and Plus button. Added a dedicated hook for dialog, form, loading, and in-memory mock project state. Wired both create buttons and owned-project rename/delete actions; shared projects hide actions. Create includes a live slug preview, rename includes the current name and an auto-focused input with Enter submission, and delete is an input-free destructive confirmation. Added a mobile sidebar scrim that closes on outside taps. Passed ESLint, TypeScript, production build, and diff whitespace checks. Browser interaction checks were not run. No API calls or persistence were added.

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

- Feature 04 readability fix: explicitly applied the primary text and caret colors to the project name input and retained full text opacity while saving, keeping create and rename values readable on the dark background.
- The dark palette from `ui-context.md` is implemented in `app/globals.css`; the root layout enables dark variants and CSS uses `color-scheme: dark`.
- Generated `components/ui/*` files were not edited after installation.
- Production builds fetch Geist fonts and need access to Google Fonts. The build passed with network access.
- The editor sidebar starts closed. Project dialogs use in-memory mock data; changes reset on reload.
- Browser interaction checks were not run; static checks and production compilation passed.
- Feature 03 review fix: pinned the shared auth URLs to `/sign-in` and `/sign-up`, matching the implemented pages. Removed environment overrides that could point Clerk and public route protection at nonexistent custom paths.
- Feature 03 layout review: moved `ClerkProvider` inside `<body>` around page children, preserving all provider options and root font classes. Production build passed.
