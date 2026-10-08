# Product Planning for Claude Code: operating instructions

For owners and product leads who decide which improvements to deliver, check release readiness and retain customer feedback responsibly. Harbour Product Studio is fictional demo data. Set your business details in brand.json.

Read the records through scripts/planning.mjs before answering. Never invent a release date, customer request or approval. An ambiguous reference lists candidates and stops. Use the operator's name for --actor; it is an audit label, not authentication or a signature. Nothing here sends, pays, deploys or deletes.

## One route per recurring job

- backlog: .claude/commands/backlog.md
- feature: .claude/commands/feature.md
- prioritise: .claude/commands/prioritise.md
- release-review: .claude/commands/release-review.md
- dependencies: .claude/commands/dependencies.md
- feedback: .claude/commands/feedback.md
- owner-workload: .claude/commands/owner-workload.md
- attention: .claude/commands/attention.md
- compliance: .claude/commands/compliance.md
- activity: .claude/commands/activity.md
- weekly-review: .claude/commands/weekly-review.md
- add-feature: .claude/commands/add-feature.md
- update-feature: .claude/commands/update-feature.md
- add-release: .claude/commands/add-release.md
- update-release: .claude/commands/update-release.md
- add-dependency: .claude/commands/add-dependency.md
- add-feedback: .claude/commands/add-feedback.md
- review-feedback: .claude/commands/review-feedback.md
- decide: .claude/commands/decide.md
- log: .claude/commands/log.md
- draft-release: .claude/commands/draft-release.md
- import: .claude/commands/import.md
- export: .claude/commands/export.md
- customise: .claude/commands/customise.md
- new-view: .claude/commands/new-view.md

Use node scripts/planning.mjs help for the command list and docs/cli.md for arguments. --json works on every command. Read docs/compliance.md before changing retention policy. The source of truth is the database, never a past answer.

Migrations are in supabase/migrations/. Commands live only in .claude/commands/. scripts/lib/db.mjs selects DATABASE_URL or local PGlite in .data/. Use one local process at a time. Shared Postgres access requires authenticated users, restricted privileges and tested recovery. Never expose the database owner credential to a browser. Database administrators can alter audit history.

Read features before changing them. Core edits and added dependencies invalidate prior approval. A release date change invalidates approval for its active features. Imported source statuses are unverified history. A shipped feature cannot be edited through this CLI; create a follow-up.

Real imports, exports, drafts and generated views are private and ignored by Git. Do not commit personal information. Retention flags prompt an owner decision; no automatic destruction exists. Preserve legal holds until a responsible reviewer clears them.

Omni by Enterprise DNA builds and runs your version: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=aha&utm_source=github&utm_medium=instructions
