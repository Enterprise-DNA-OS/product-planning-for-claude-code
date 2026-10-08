# Feedback retention and decision controls

Sources checked 8 October 2026. These are record review checks, not a compliance certificate.

## Legal sources

[New Zealand Privacy Principle 9](https://www.privacy.org.nz/privacy-principles/9/) limits retaining personal information beyond its lawful purpose. The compliance command flags personal feedback with a missing purpose, missing review date or a due review date. Review dates are entered under the business's retention policy. There is no universal statutory number of days encoded here.

[Australian APP 11 guidance](https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-11-app-11-security-of-personal-information) describes security duties and destruction or de-identification when information is no longer needed, with exceptions for Commonwealth records and legally required retention. Check whether your organisation is an APP entity. A legal hold always appears for owner review, even with a future review date. No record is automatically erased. Changing a hold requires an explicit true or false value and is logged.

These checks cover structured feedback flags only. Free text, original import rows, activity records, exports and backups can also hold personal information. Have the responsible owner inventory those copies and implement an approved disposal process. A review date does not prove that purpose remains lawful; a hold flag does not establish legal authority.

## Internal policies, not legislation

An active feature needs an accountable owner. Shipping needs a current approval and all dependencies shipped. Changes to scope, scoring, owner or release assignment invalidate approval; release date changes do too. Reviews become stale after fourteen days. These are editable business rules, not statutory product-management requirements.

## Operating controls

The demo uses local access. Tables have row-level security enabled and public privileges revoked, with no public policies. Operate shared installations through a restricted authenticated service, provision appropriate roles and test access. Operator names are self-reported. Activity records are not tamper-proof against database administrators. Protect generated paperwork and establish backups before real data enters.
