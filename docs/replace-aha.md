# Replace Aha! Roadmaps feature planning

Aha!'s [export guide](https://support.aha.io/aha-roadmaps/account/security-and-system-requirements/export-backup-aha-data~7444656153661520637) and [list report guide](https://support.aha.io/aha-roadmaps/support-articles/analytics/list-report~7444638852598957815) were checked 8 October 2026. Create a list report, select the records and fields, then export CSV. Aha! reports have configurable columns; this importer covers the feature list described below, not every possible report.

## Prepare the export

Include one row per feature with Feature reference num, Feature name, Feature description, Feature status, Feature assigned to, Release name and Release release date. Reference and name are required; a named release requires its date. The importer also accepts Reference, Name, Description, Status, Assigned to, Release and Release date aliases, case-insensitively. Rename headers to these documented mappings if your report uses another label. Use ISO dates. Do not use a feature/ideas joined report with repeated features.

The fixture is synthetic, not a captured customer export. The source documents establish CSV export, not a universal fixed header schema.

```bash
npm run migrate
npm run planning -- import aha --file=imports/aha.csv --actor="Migration operator" --dry-run
npm run planning -- import aha --file=imports/aha.csv --actor="Migration operator"
```

Use a fresh database for real imports, without the fictional seed. Each import is one atomic transaction. A failed row rolls everything back. An identical repeat is skipped; changed repeats fail for reconciliation instead of overwriting local decisions. All source columns are preserved in source_row. Export counts and references and compare with Aha! before relying on the result.

## What maps

Feature reference, name, plain description, owner and source status become records. A release name and date create or match a release; conflicting dates fail. The source states Under consideration/New/Backlog map to backlog, Ready to develop/Planned to planned, In progress/In development to in_progress, Shipped to shipped and Will not implement/Cancelled to cancelled. For custom statuses pass --status-map=imports/status-map.json containing an object of source labels to one of these five statuses. Unknown states fail.

Scoring starts at reach 0, impact 1, confidence 0.5 and effort 1 day. Imported release capacity starts at zero. These are placeholders to review, not values inferred from Aha!. An imported shipped state preserves source history; it does not create a local approval. Review every active item, set actual estimates and capacity and record decisions before using release readiness.

## Separate migration work

Ideas portal identities and votes, attachments, whiteboards, rich text formatting, goals, initiatives, epics, integrations, comments, dependencies, custom scoring and historical approval records are not reconstructed by this feature-list import. Map required records separately with Enterprise DNA or your coding agent. Original fields retained in source_row are not automatically active workflow fields. Keep exports and files secure. Reconcile a representative release, then the complete count and statuses. Run both systems until the owner accepts the result; do not cancel an account from here.
