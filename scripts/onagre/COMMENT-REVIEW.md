# Reviewing information retained in comments

The admin Onagre page's **Textes à reprendre** tab groups source wording by its
activity, method, resolved classification and current impact types. Counts are
distinct projects and demandes per group. They overlap across groups and must
not be summed. Case, whitespace and apostrophe normalization do not establish a
semantic equivalence between different wording.

The inventory includes all nonempty prepared projects. Each group separates the
selection for new imports, existing linked DN references and blocked projects.
Source notes for linked DN demandes describe the preparation; the importer does
not append those notes to the existing DN record.

An unresolved species is a failed source/reference match. It does not by itself
prove absence from TAXREF, absence from the protected-species catalogue or lack
of legal protection. Review those cases separately from activity/method choices.

## Team proposals

An administrator with `admin:onagre:manage` can record a proposed destination,
keep information in comments, request a reference review, or leave the question
pending. Destination choices come from the current Pitchou impact/method/pursuit
tables and are checked again when saving. Each proposal records its actor,
version, source group hash and history. Concurrent edits return a conflict.

These are review proposals only. No importer consumes them automatically, and
saving them never changes a dossier or a species impact. Before implementing an
accepted rule, review its conditions and exact source scopes, preserve the raw
text and verify the resulting structured fields. A group with unresolved taxa
cannot be mapped to a method through this form.

## Loading a retained inventory locally

Apply `20261110030000_onagre-comment-review.ts` to the local development database.
The private inventory contains source text and must not be committed. Load its
`groups.json` using the guarded local loader:

```sh
nix develop --command node --env-file=.env --import tsx \
  scripts/onagre/load-comment-review.mjs /absolute/path/to/groups.json
```

The loader accepts grouped evidence with `id`, `category`, `value`, `context`,
`variants`, `projects`, `demandes`, `descriptions`, `projectCount`, `demandeCount`,
`populations` and source `examples`. It records the inventory's SHA256 and hashes
each staged group. It refuses a replacement that changes any existing group;
refreshing an inventory with saved decisions requires a separate reviewed change.
Repeated loading of identical evidence is idempotent. It creates no proposals.

The ordinary admin decisions export includes comment proposals and their audit
history. The source inventory remains separately retained with its generation
and validation receipts.
