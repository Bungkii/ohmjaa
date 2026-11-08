# Instructions for coding agents

## Read first

- Read `README.md` and `CONTEXT.md` before changing product behavior.
- Treat the current code as the source of truth. `docs/teacher-setup.md` and older plans may describe work that is not wired into the active `/` route.
- Keep user-facing text in Thai unless the task explicitly requests another language.

## Scope and safety

- Make the smallest change that fulfills the request. Preserve unrelated changes and untracked files.
- Do not commit `.env.local`, credentials, generated `.next/` files, or student data exports.
- Do not assume the current UI enforces teacher-only access. Check both server code and Supabase RLS before changing access or describing it as secure.
- Review migration dependencies and existing policies before editing SQL. Do not apply migrations to a live database without checking the target schema and effects.
- Keep date calculations in Asia/Bangkok. Do not silently count weekends or school holidays as chore days.

## UI conventions

- Keep the shared header aligned across all views. Show the bottom navigation on screens below `lg`; desktop uses the header navigation.
- Make controls usable on mobile and desktop, with visible labels, keyboard focus, and accessible dialog titles.
- Use the existing `react-hot-toast` for transient feedback and Headless UI Dialog for confirmation before destructive actions. The repository is not currently a shadcn/ui project.
- Reports use browser printing through `window.print()` and the existing print styles; avoid adding a separate PDF renderer unless requested.

## Verification and Git

- Run `npx tsc --noEmit`, `git diff --check`, and a production build for code changes. If the build fails, report the exact failure and distinguish code errors from environment issues.
- For date or aggregation changes, check a case that crosses a weekend and a school holiday.
- Stage only files in scope. The repository may contain unrelated untracked files; leave them alone.
- The remote is `origin` at `https://github.com/Bungkii/ohmjaa.git`. Check branch and status before committing or pushing; follow the user's current Git instruction.
