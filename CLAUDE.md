# SISTUR — Sistema Integrado de Suporte para Turismo em Regiões

## Project Overview

Tourism destination management and educational platform built on Mario Beni's systemic principles. Helps tourism stakeholders assess, plan, and improve destinations through diagnostics, training, and gamified learning.

## Tech Stack

- **Frontend**: Vite + React 18 + TypeScript (SWC)
- **UI**: shadcn-ui (Radix primitives) + Tailwind CSS + Framer Motion
- **State**: React Context (Auth, Profile, License) + TanStack React Query
- **Database**: Supabase (PostgreSQL) with RLS policies
- **Auth**: Supabase Auth (email/password)
- **Forms**: react-hook-form + Zod validation
- **Charts**: Recharts
- **Games**: Three.js / React Three Fiber, Canvas

## Commands

```bash
npm run dev        # Start dev server on port 8080
npm run build      # Production build
npm run build:dev  # Development build
npm run lint       # ESLint check
npm run preview    # Preview production build
npm run test       # Run Vitest tests
npm run test:ui    # Vitest with browser UI
```

## Project Structure

```
src/
├── components/    # 154 reusable components across 21 feature modules
│   ├── ui/        # shadcn-ui primitives (button, dialog, form, etc.)
│   ├── layout/    # Route guards: ProtectedRoute, AdminRoute, ERPRoute, EduRoute, LicenseRoute
│   ├── dashboard/ # Assessment cards, charts, IGMA warnings
│   ├── diagnostics/ # Indicator panels, data import
│   ├── edu/       # Certificates, video players, exam components
│   ├── admin/     # Exam builder, question bank, training management
│   ├── forum/     # Posts, comments, moderation
│   ├── projects/  # Project views, task/milestone dialogs
│   ├── enterprise/# Enterprise profiles, data entry
│   └── games/     # TCG, RPG, Memory, Treasure Hunt components
├── contexts/      # ProfileContext, LicenseContext
├── hooks/         # 50+ custom hooks (useAuth, useAssessments, useForum, etc.)
├── pages/         # 44 lazy-loaded page components
├── lib/           # Core logic (igmaEngine.ts — Mario Beni's 6 systemic rules)
├── integrations/  # Supabase client + auto-generated types
└── data/          # Static data (game cards, biomes, etc.)
```

## Architecture

### Routing & Access Control

All pages are lazy-loaded via `React.lazy()` with `Suspense`. Route guards:

- `ProtectedRoute` — Requires authentication
- `AdminRoute` — Requires ADMIN role
- `ERPRoute` — Requires ERP system access
- `EduRoute` — Requires EDU system access (optional `requireProfessor`)
- `LicenseRoute` — Requires valid license + optional `requiredFeature` prop

### Roles

`ADMIN`, `ANALYST`, `VIEWER`, `ESTUDANTE`, `PROFESSOR`

### Core Modules

1. **ERP** — 3-pillar diagnostics (RA/OE/AO), IGMA interpretation engine, action plans
2. **EDU** — Training catalog, learning paths, exams, certificates
3. **Games** — TCG, RPG, Memory, Treasure Hunt with persistent sessions
4. **Forum** — Posts, comments, moderation
5. **License** — 7-day trial, Basic/Pro/Enterprise plans, feature gating

### Database

- 40+ Supabase tables with RLS policies
- 30+ migrations in `supabase/migrations/`
- Key RPC functions: `complete_user_onboarding`, `calculate_assessment`, `expire_trial_licenses`, `upgrade_license`

## Conventions

### Imports

Use the `@/` path alias for absolute imports:
```ts
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
```

### TypeScript

- Relaxed strict mode: `noImplicitAny: false`, `strictNullChecks: false`
- Path alias: `@/*` maps to `./src/*`
- Unused vars/params are allowed (lint rule is `warn`)

### Styling

- Tailwind CSS with HSL custom properties
- Dark mode via `dark:` prefix
- Custom color tokens: `pillar-ra`, `pillar-oe`, `pillar-ao`, `severity-critico`, `severity-moderado`, `severity-bom`
- Fonts: Plus Jakarta Sans (display), Inter (body)

### Components

- Use shadcn-ui primitives from `@/components/ui/`
- Forms: react-hook-form + Zod schemas
- Notifications: Sonner toasts (`sonner`) or shadcn toast (`@/hooks/use-toast`)
- Animations: Framer Motion for page transitions and interactions

### Testing

- Framework: Vitest + React Testing Library
- Test files: `*.test.ts` or `*.test.tsx` alongside source files
- Run: `npm run test`

### Code Splitting

Vendor chunks configured in `vite.config.ts`:
- `vendor-react`: React, ReactDOM, React Router
- `vendor-query`: TanStack React Query
- `vendor-supabase`: Supabase client
- `vendor-charts`: Recharts
- `vendor-ui`: Core Radix UI primitives

## Domain Glossary

| Term | Meaning |
|------|---------|
| IGMA | Interpretation engine applying Mario Beni's 6 systemic rules |
| RA | Relações Ambientais (Environmental Relations pillar) |
| OE | Organização Estrutural (Structural Organization pillar) |
| AO | Ações Operacionais (Operational Actions pillar) |
| Trilha | Learning path/track containing multiple training modules |
| Rodada | Assessment round/cycle |
| Destino | Tourism destination being evaluated |
