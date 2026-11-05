# Reviewed correspondence decisions

The owner requested validation of clear workbook proposals and a review of all unhandled fields. `review-decisions/entries.json` records that specific review against the retained workbook and the original dump. It is not a classifier for future source files.

The batch applied locally changed 464 entries:

| Change                                               | Entries |
| ---------------------------------------------------- | ------: |
| Workbook proposal, À valider → Validée               |     122 |
| Workbook exclusion, À discuter → Exclue              |       2 |
| Previously À traiter → inferred draft, À valider     |     272 |
| Previously À traiter → specific question, À discuter |      68 |

The two exclusions are `decisions.versiondecisions` and `demandes.versiondemandes`. The workbook marks both with X and the source describes technical version counters. Their values remain in the dump.

The resulting local totals are 124 Validée, 275 À valider, 133 À discuter, 2 Exclue and 0 À traiter. The owner's two previous validations were preserved. The 37 activity validations include explicit current Pitchou activity codes, so Correspondances and Objets et activités show the same decisions.

The 272 new drafts include proposals to retain technical provenance without adding it to business fields. They are not 272 approved business transformations. The 68 questions cover unresolved identity, geographic priority, expert categories, chronology, control-to-prescription links, species conversion and quantities. The existing three À valider entries concerning ERC presence and accepted/refused decisions remain unapproved.

## Reproduce or inspect the batch

The manifest includes each expected version, original proposal, confidence, editable fields, evidence and proposed decision. The runner refuses remote hosts, checks the exact database name and source fingerprints, and skips entries changed since review. An inference cannot become Validée or Exclue through this batch. All writes use the normal mapping save function and revision history in one transaction. Matching decisions are unchanged on rerun.

Preview against the local preparation workspace:

```sh
ONAGRE_EXPECTED_DATABASE=pitchou_onagre_workspace \
  node --env-file=.env --env-file=.fleet/onagre/local.env --import tsx \
  scripts/onagre/review-decisions.ts
```

Append `--apply existing-actor-email` only to apply the reviewed decisions with an existing active actor for revision attribution. The completed local application used the owner's account. This command does not create dossiers, run an importer, change shared rules or deploy anything. Validated rules still need implementation in the importer.

`verify-decision-review.ts` uses disposable local databases through `ONAGRE_TRANSFER_TEST_ADMIN_URL`. It verifies the full manifest, read-only preview, actor attribution, replay, intervening edits, inference approval refusal and transactional rollback after a deliberately invalid activity. It never migrates the preparation database.
