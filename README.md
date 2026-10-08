# Product Planning for Claude Code

Own the backlog, release decisions and feedback records behind your product plan. A database plus Claude Code, Codex, OpenCode or Cursor. Built by Enterprise DNA, MIT licensed.

## Three ways to use it

- **Do it yourself:** install the free version, run the demo and import a prepared Aha! feature-list export. Hosting and agent use have their own costs.
- **We customise it:** Enterprise DNA maps your records, writes your review rules and builds the screens or connections you need. A setup fee, then a retainer for ongoing work.
- **We run it for you:** Omni by Enterprise DNA installs, connects and operates your version. One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=aha&utm_source=github&utm_medium=readme).

## Try the fictional business

Node 20 or later. No external database is required for the demo.

```bash
npm install
npm test
npm run demo
npm run planning -- prioritise
npm run planning -- release-review --json
npm run view
npm run docs
```

The embedded PGlite database persists in .data/db. Set DATABASE_URL for Postgres. Use a fresh database without the fictional seed for real records. The six record sets are releases, features, dependencies, feedback, decisions and activity. Every table has UUID ids and update timestamps; three views answer priorities, release readiness and retention review.

## The weekly work

Start with /weekly-review: priorities, releases, attention and retention flags. /decide records the owner and reason. /draft-release writes a private internal brief. /customise changes the rules through a migration; /new-view adds a read-only report. There are 24 CLI commands including help and 25 slash recipes. [CLI syntax and calculations](docs/cli.md).

Features cannot ship with unshipped blockers or stale approval. Scope edits invalidate approval. Dependency cycles fail. Changes are transactional and logged with an operator label; this is not authentication or a tamper-proof signature. A local database runs one process at a time. Shared operation needs restricted roles, authenticated access and tested backups.

## Ten questions for Monday

Aha! already supports extensive custom reports. These are tested questions this version answers today, not unsupported claims that Aha! cannot produce similar analysis.

- Which open features rank highest under our scoring rule? `prioritise`
- Which high-priority features still have blockers? `prioritise`
- Which releases exceed their remaining capacity? `release-review`
- Which releases contain features without current approval? `release-review`
- Which owners carry the most estimated work? `owner-workload`
- Which owners have stale feature reviews? `owner-workload`
- Which overdue releases still have open features? `release-review`
- Which active features have no accountable owner? `attention`
- Which feedback records need a retention review? `compliance`
- Which dependencies prevent a feature from shipping? `dependencies`

## Your first hour: ten things to ask for

1. Put our business name and colours on the release brief.
2. Show the highest ranked items with unresolved dependencies.
3. Find releases whose remaining effort exceeds capacity.
4. Assign an owner to every active feature.
5. Show decisions that no longer match current scope.
6. Draft the next internal release review.
7. Check customer feedback retention dates and legal holds.
8. Test our Aha! export without saving it.
9. Add our product-line field through a migration.
10. Add a private weekly view for the owner.

## Bring your history

```bash
npm run planning -- import aha --file=imports/aha.csv --dry-run --actor="Migration operator"
npm run planning -- import aha --file=imports/aha.csv --actor="Migration operator"
```

The [replacement guide](docs/replace-aha.md) specifies the feature-list columns and status mapping. Repeated identical imports are skipped; changed rows are rejected for reconciliation. Ideas, files, votes, integrations and historical decisions need separate mapping. Imported capacity and scores need review. Nothing is cancelled or sent.

## Paperwork, privacy and proof

brand.json controls read-only views, internal release briefs and decision records. [Compliance documentation](docs/compliance.md) cites NZ Principle 9 and Australian APP 11, distinguishes internal policies and preserves legal holds. No automatic destruction or compliance certification exists. [Why no front end](docs/why-no-front-end.md) explains what the free base provides.

npm test creates disposable data, exercises every command and checks invalid approvals, dependency cycles, import rollback, repeated imports, holds, ambiguous references, drafts, exports and escaped HTML. GitHub checks run the suite on Linux, Windows and Postgres. [Research and scope](docs/research.md).

Not affiliated with Aha! or Anthropic. Your records remain in a database you control.
