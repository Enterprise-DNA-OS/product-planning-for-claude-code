# Import

Read docs/replace-aha.md. Run a dry run, reconcile counts and status mapping with the operator, then run the same import without --dry-run. Never interpret an imported shipped status as a new local approval.

```bash
node scripts/planning.mjs import aha --file=fixtures/aha.csv --dry-run --actor="Migration operator"
```

Append --json for structured results. Replace example values with the operator's confirmed values. An ambiguous match lists candidates and exits 1. Nothing sends or publishes. Drafts stay in drafts/.
