# Add Feedback

Read the current records first. Explain missing owners, evidence and dates before proposing a change.

```bash
node scripts/planning.mjs add-feedback HAR-106 --organisation="Harbour Services" --summary="Need monthly reminders" --personal=false --actor="Product owner"
```

Append --json for structured results. Replace example values with the operator's confirmed values. An ambiguous match lists candidates and exits 1. Nothing sends or publishes. Drafts stay in drafts/.
