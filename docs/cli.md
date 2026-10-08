# Product planning CLI

Run npm run planning -- <command> [reference] [--name=value]. Quote values containing spaces. Append --json for structured output. Dates use YYYY-MM-DD, confidence is 0 to 1, impact is 0 to 5, reach is nonnegative and effort is positive days. All database changes require --actor and are transactional; --dry-run rolls them back.

## Recipes

### backlog

```bash
node scripts/planning.mjs backlog
```

### feature

```bash
node scripts/planning.mjs feature HAR-101
```

### prioritise

```bash
node scripts/planning.mjs prioritise
```

### release-review

```bash
node scripts/planning.mjs release-review
```

### dependencies

```bash
node scripts/planning.mjs dependencies
```

### feedback

```bash
node scripts/planning.mjs feedback
```

### owner-workload

```bash
node scripts/planning.mjs owner-workload
```

### attention

```bash
node scripts/planning.mjs attention
```

### compliance

```bash
node scripts/planning.mjs compliance
```

### activity

```bash
node scripts/planning.mjs activity
```

### weekly-review

```bash
node scripts/planning.mjs weekly-review
```

### add-feature

```bash
node scripts/planning.mjs add-feature --reference=HAR-106 --name="Service reminder" --owner=Mere --actor="Product owner"
```

### update-feature

```bash
node scripts/planning.mjs update-feature HAR-106 --reach=40 --impact=3 --confidence=0.8 --effort=4 --actor="Product owner"
```

### add-release

```bash
node scripts/planning.mjs add-release --name="Summer pilot" --due=2027-01-20 --capacity=15 --actor="Product owner"
```

### update-release

```bash
node scripts/planning.mjs update-release "Summer pilot" --capacity=20 --actor="Product owner"
```

### add-dependency

```bash
node scripts/planning.mjs add-dependency HAR-106 --blocker=HAR-104 --actor="Product owner"
```

### add-feedback

```bash
node scripts/planning.mjs add-feedback HAR-106 --organisation="Harbour Services" --summary="Need monthly reminders" --personal=false --actor="Product owner"
```

### review-feedback

```bash
node scripts/planning.mjs review-feedback <full-feedback-id> --purpose="Review service request" --review-on=2027-01-20 --actor="Privacy owner"
```

### decide

```bash
node scripts/planning.mjs decide HAR-106 --outcome=approve --reason="Scope and evidence checked" --actor="Product owner"
```

### log

```bash
node scripts/planning.mjs log HAR-106 --note="Owner confirmed the estimate" --actor="Product owner"
```

### draft-release

```bash
node scripts/planning.mjs draft-release "Spring service release"
```

### import

```bash
node scripts/planning.mjs import aha --file=fixtures/aha.csv --dry-run --actor="Migration operator"
```

### export

```bash
node scripts/planning.mjs export --file=exports/planning-backup.json
```

## Semantics

Priority = reach * impact * confidence / effort_days. This is a local policy score, not a revenue prediction. Release capacity is an owner-entered remaining allowance in days, compared with effort for active features. It is not a calendar or staff scheduling engine. Stale means last_reviewed is missing or older than fourteen calendar days, an internal policy.

update-feature accepts --name, --owner, --description, --status, --reach, --impact, --confidence, --effort and --release. Statuses are backlog, planned, in_progress, shipped and cancelled. A ship operation must be separate from other edits, have a current approve decision and an owner, and have all blockers shipped. Core edits and added dependencies increment revision, so the latest decision must match that revision. Feedback and log entries do not change scope or approval. Terminal features cannot be edited.

update-release accepts --due, --capacity and --status (planned, shipped, cancelled). Closing requires no active features. Changing a due date invalidates approvals for active features. Imported release capacity is zero until reviewed.

decide accepts approve, defer or reject plus --reason. The latest decision is authoritative. This records a business judgment, not independent certification.

add-feedback accepts --personal=true|false, --purpose, --review-on and --hold=true|false. review-feedback needs the full feedback id, --purpose and --review-on; omitting --hold preserves the current hold. There is no erase command.

export writes a consistent JSON snapshot of all six domain record sets and refuses to overwrite an existing file. It is a portable data export, not a tested database restore. Also use database-native backups and test recovery before live operation. draft-release creates an internal brief only. docs and view create private read-only HTML snapshots.
