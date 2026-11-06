# Teacher Workflows Implementation Plan

**Goal:** Give teachers a private dashboard for assignment follow-up, student profiles, discipline case management, today's work, and an audit trail.

**Architecture:** Supabase Auth identifies teachers. A teacher-student access table scopes every server query and mutation. Database policies and triggers enforce the same scope and record changes. The client renders only data returned by guarded server actions.

**Tech Stack:** Next.js 16, React 19, Supabase Auth/Postgres, TypeScript.

## Tasks

- [x] Add teacher access and audit migration with restrictive discipline policies.
- [x] Add login, session checks, scoped reads, and guarded mutations.
- [x] Add assignment status editing and per-student profile.
- [x] Add discipline status, notes, and edit controls.
- [x] Add today's work and audit history views.
- [ ] Apply migration and provision teacher accounts in Supabase, then run a database-backed end-to-end check.
