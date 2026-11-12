# Reviewing existing DN overlaps

The admin page `/onagre?tab=doublons` stores team decisions separately from the
importer. Saving a decision does not import, merge, delete, or link a dossier.
The importer must explicitly consume reviewed decisions before they affect a run.

The initial review contains 129 projects and 219 prepared demandes: 174 await a
decision, while 45 already have confirmed DN links. Omitted source demandes are
listed for context and are never reinstated by this interface.

The separate read-only tab `/onagre?tab=doublons-evites` presents all 402 confirmed
links across 378 source projects and 392 preserved DN dossiers, including the 45
links in partially resolved projects. It explains the actual evidence for each
match, distinguishing full references from manual documentary resolution. It
does not present a possible candidate or a team `ignore` choice as a proven link.

`onagre_confirmed_duplicate` stores this immutable presentation evidence. The
same local loader accepts `pitchou-onagre-confirmed-duplicates-v1` bundles with
a `links` array of `ConfirmedDuplicate` values. The original confirmed ledger
must be checked when preparing that private bundle. The export includes the
read-only collection as `confirmedDuplicates`; it is not an import instruction.

## Storage and export contract

- `onagre_duplicate_project` stores immutable, hash-bound review evidence: source
  project identity and reconciliation hash, the specific blocking reason, the
  question to resolve, candidate DN facts, and each prepared demande's identity.
- `onagre_duplicate_decision` stores the latest choice per `demande_key`, bound to
  `project_id` and `review_hash`, with justification, actor, version and timestamp.
- `onagre_duplicate_revision` retains every previous and subsequent decision.
- `/onagre/export` includes these three collections in `duplicateReview`, under
  `projects`, `decisions` and `revisions`. This extends the existing decisions
  export without changing its other fields.

Outcomes have precise meanings:

| Outcome             | Meaning for a future importer consumer                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| No row or `pending` | Keep this demande blocked.                                                                                              |
| `ignore`            | Do not create this Onagre demande. Preserve all existing DN records. This alone does not establish a confirmed DN link. |
| `import_new`        | The team requests a separate imported demande despite the recorded candidate overlap. Other import checks still apply.  |

A choice applies only to its demande, never to all siblings or all candidates of
the project. Confirmed links are read-only and rejected server-side if submitted
as decisions. A version check prevents overwriting another reviewer's work.

Before consuming decisions, validate the current prepared source against
`payload.sourceHash` (the importer's `reconciliationHash`, not a file-byte hash),
the decision's review hash against the retained project, and the current DN
overlap evidence. Do not bypass new conflicts introduced after the review. Do
not turn an `ignore` choice into a DN association based only on free-text reasons.

## Loading a review locally

Apply migration `20261110010000_onagre-duplicate-review.ts` through the normal
database migration workflow. Load a private reviewed JSON bundle with:

```sh
node --env-file=.env --import tsx scripts/onagre/load-duplicate-review.mjs /path/to/private-review.json
```

The loader requires the declared development database on localhost port 5434.
It only writes review evidence. The bundle format is
`pitchou-onagre-duplicate-review-v1`, with a `projects` array of `DuplicateReview`
values from `libs/types/src/onagreDuplicates.ts`. Each `review_hash` is the SHA256
of `JSON.stringify(payload)`. Reloading identical evidence is idempotent;
changing an existing review is refused so no prior decision silently changes
meaning. Real source data belongs in private bundles, never committed seeds.

Local transactional regression checks (all synthetic writes rolled back):

```sh
node --env-file=.env --import tsx --test scripts/onagre/duplicate-review.test.mjs
```
