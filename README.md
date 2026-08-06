# K-Tech Client Portal

Foundation scaffold for the K-Tech Client Portal — a commercial SaaS client
portal. This phase delivers **only the architectural foundation**: auth,
route protection, dashboard shell, theming, and the data layer that future
modules (invoices, forms, messaging, CMS) will plug into. None of those
modules are implemented yet, by design.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| UI | React, Tailwind CSS, shadcn/ui (New York style) |
| Motion | Framer Motion |
| Backend | Supabase (Postgres, Auth, RLS) |
| Forms | React Hook Form + Zod |
| Server state | TanStack Query |
| Toasts | Sonner |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase project's keys
```

Apply the database schema to your Supabase project:

```bash
# Using the Supabase CLI, from the project root:
supabase link --project-ref <your-project-ref>
supabase db push
```

This runs `supabase/migrations/0001_init_core_schema.sql`, which creates
`organizations`, `profiles`, `notifications`, the `user_role` enum, Row
Level Security policies, and a trigger that provisions a `profiles` row
whenever someone signs up.

Then run the dev server:

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll land on `/login`. Register an
account, verify the email (Supabase sends this automatically), and you'll
be dropped into `/dashboard`.

## Folder structure

```
src/
  app/
    (auth)/            Public auth screens — login, register, forgot/reset
                        password, verify-email. Each route protected by
                        middleware.ts, which bounces signed-in users away.
    (dashboard)/        Everything behind auth. Has its own layout.tsx
                        (sidebar + topbar), loading.tsx, and error.tsx.
      dashboard/         Home page + reserved routes for future modules
        invoices/          Phase 2 — route stub renders <ComingSoon>
        forms/             Phase 2 — route stub renders <ComingSoon>
        messages/          Phase 2 — route stub renders <ComingSoon>
        content/           Phase 2 — route stub renders <ComingSoon>
      settings/          Tabbed settings: profile, appearance, notifications
    auth/callback/      Route handler that exchanges Supabase's emailed
                        code for a session (email verification, password
                        recovery)
    api/health/         Trivial health-check endpoint
  components/
    ui/                 shadcn/ui primitives (Button, Input, Card, Form…)
    layout/             Sidebar, Topbar, ThemeToggle, UserNav
    auth/               Auth forms + the shared AuthCard shell
    settings/           Settings-tab forms
    notifications/      Notification bell + list
    shared/             EmptyState, ErrorState, LoadingSpinner, PageHeader,
                        ComingSoon — the vocabulary every future module
                        should reuse
    providers/          Theme / TanStack Query / Auth context, composed
  lib/
    supabase/           client.ts (browser), server.ts (RSC/route handlers),
                        admin.ts (service-role, server-only),
                        middleware.ts (session refresh helper)
    validations/        Zod schemas for every form
    utils.ts            cn(), formatDate(), getInitials()
    constants.ts        USER_ROLES, route constants
    fonts.ts            Manrope / Inter / JetBrains Mono
  hooks/                use-auth, use-user, use-notifications, use-toast
  types/                database.types.ts (Supabase types), index.ts (app types)
  config/               site.ts, nav.ts (single source of truth for the sidebar)
middleware.ts           Root route-protection + session-refresh middleware
supabase/
  migrations/           SQL migrations, starting with 0001_init_core_schema.sql
  seed.sql              Local dev seed data
```

## Architectural decisions worth knowing

- **Route groups split public and protected UI.** `(auth)` and
  `(dashboard)` are separate layouts; `middleware.ts` is the single place
  that decides who can see what, based on path prefix. Add a new protected
  section by nesting it under `(dashboard)`, or extend the `matcher` /
  path checks in `middleware.ts` if it lives elsewhere.
- **Roles live in one place.** `USER_ROLES` in `src/lib/constants.ts`
  mirrors the `user_role` Postgres enum in the migration. If you add a
  role, update both, plus `ROLE_LABELS`.
- **The sidebar is config-driven.** `src/config/nav.ts` is the only file
  that needs to change to add a nav item. Items with `comingSoon: true`
  render disabled with a "Soon" pill instead of being deleted from the
  IA — this is how the four Phase-2 modules are represented today.
- **Every future module gets a route stub already.** See
  `src/app/(dashboard)/dashboard/invoices/page.tsx` (and its
  forms/messages/content siblings) for the pattern: real route, real
  metadata, `<ComingSoon />` body. Phase 2 replaces the body, not the
  routing.
- **Data fetching is TanStack Query, mutations go through Supabase
  directly from client components** (see `use-user.ts`,
  `use-notifications.ts`). For anything privileged, use
  `src/lib/supabase/admin.ts` from a Route Handler or Server Action —
  never import it into a client component.
- **RLS is the source of truth for access control**, not just the
  middleware redirect. The middleware improves UX (no flash of protected
  content); Postgres policies in the migration are what actually
  enforce it.

## What's intentionally not built yet

Invoices, Forms, Messaging, and CMS/Content are out of scope for this
phase. Their navigation entries, routes, and empty-state components exist
so Phase 2 can implement each module by replacing a `page.tsx` body and
flipping `comingSoon: false` in `src/config/nav.ts` — not by re-architecting
routing, auth, or layout.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:types` | Regenerate `src/types/database.types.ts` from your live Supabase schema |
