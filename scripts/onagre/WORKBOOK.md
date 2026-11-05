# Original correspondence workbook

`Correspondance Pitchou onagre.xlsx`, SHA-256 `718741d4c7c5450a946b47fab622c8dca5b5cb11185007c83dff51745310a548`, is now retained as cell data in `libs/common/src/onagre/workbook/source.json`. The original Excel file is no longer required for dump preparation. The local workspace also retains its exact original bytes in `onagre_document`; the audit verified their fingerprint.

## Coverage

| Sheet           | Correspondence rows | Content                                                                       |
| --------------- | ------------------: | ----------------------------------------------------------------------------- |
| Projet          |                  27 | Fields, proposals, 18 confidence values, two comments, sheet notes            |
| motifderogation |                  74 | Reference values, proposals, separate seven-item Pitchou motif legend         |
| Demandes        |                  28 | Fields, proposals, two comments, sheet notes                                  |
| decisions       |                  20 | Seven decision natures and thirteen fields                                    |
| Objet           |                  44 | Activity proposals, including repeated identifiers and one additional comment |

The 193 rows contain 190 nonempty proposals. All five original comments are preserved. The confidence column is populated only on Projet. General notes include approximate historical project/demande counts, the warning about multiple demandes per project and the Projet reminder to discuss its mapping. The motif legend is shared sheet context, not seven additional row-specific decisions.

Every nonempty cell, including headers, numeric zero and boolean false, is retained with its original sheet and row number. The audit found no embedded Excel cell comments or formulas. Formatting and empty spreadsheet rows are not migration data. The original bytes remain available in the document archive.

## In the app

Open a correspondence and expand **Proposition d'origine**. It shows the proposal, **Niveau de confiance d'origine**, **Commentaire d'origine**, common sheet notes and a button to inspect technical source values. The same component appears in **Objets et activités**. Empty comments and confidence values do not add placeholder text.

This context is attached only when the database contains a snapshot with the reviewed workbook fingerprint. It does not overwrite current notes, targets, rules, statuses or activity choices. The five original comments were also verified in the local workspace's editable notes. Their separate original display survives later edits to those notes. Confidence remains the team's historical assessment, not an automatic validation status.

The old snapshot recorded the seven decision-nature rows under `decisions`; the parser had already been corrected to `naturedecision` before this change. Keys, proposals, confidence, comments and the other seed values match the snapshot. No historical snapshot is rewritten.

## Future dumps

```sh
node --import tsx scripts/onagre/prepare.ts /path/to/new-dump .fleet/onagre/new-package.jsonl.gz
```

The retained source supplies the same mapping seeds and fingerprint as reading the reviewed Excel file. No Excel path or database connection is required. New dump columns get new undecided entries. Existing keys keep their decisions and versions; the same dump fingerprint remains a no-op. Edit business decisions in the app, not the retained source JSON.

Verification uses the common workbook unit tests and `scripts/onagre/verify-workbook.ts`. The latter requires an explicit loopback `ONAGRE_TRANSFER_TEST_ADMIN_URL`, creates disposable databases, and tests initial load, duplicate load, a later dump, preserved edited decisions and a newly discovered field. An optional original Excel path additionally checks every nonempty cell, mapping seed, fingerprint, and absence of unhandled embedded comments/formulas. It never migrates or resets the workspace database.

The reviewed dump was prepared successfully with the two-argument command: 58 tables, 3,268,584 rows, 22,069 demandes, 17,569 projets and 530 initial mappings. After the owner's review and approval, the original Excel file on Polaris was moved to Trash on 25 October 2026. Its archived bytes and retained cell data remain available.
