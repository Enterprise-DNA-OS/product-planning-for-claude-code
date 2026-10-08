# Update Feature

Read the current records first. Explain missing owners, evidence and dates before proposing a change.

```bash
node scripts/planning.mjs update-feature HAR-106 --reach=40 --impact=3 --confidence=0.8 --effort=4 --actor="Product owner"
```

Append --json for structured results. Replace example values with the operator's confirmed values. An ambiguous match lists candidates and exits 1. Nothing sends or publishes. Drafts stay in drafts/.
