# ADR 4: Independent demandes and complete business history

## Context

Several procedures can belong to the same project without being successive revisions. Onagre contains projects with simultaneous demandes covering different departments. The same distinction is useful for native Pitchou and DN dossiers. The existing activity feed does not retain enough information to reconstruct every previous state, including deleted child records and replaced documents.

## Decision

A dossier groups independently editable demandes. Access is shared across the dossier; phase, location, decisions, species, comments and following remain specific to a demande. The interface selects a demande and offers read-only historical states and comparisons in Historique.

For compatibility, the existing `dossier` row and URL represent the editable demande. `dossier_projet` provides the group identity and name; `dossier_demande` provides membership and a display label. Existing single demandes need no membership row. Creating a demande copies only project description, activity and location. Linking existing demandes requires instruction access to both, and the interface explicitly announces the sharing of access.

Automatic group access is the union of the rules matched by the member demandes. Direct grants are shared, and the strongest applicable access wins, subject to account permissions. Subsequent administrative grant and override changes apply to every member. Grouping existing demandes therefore broadens access to the union of their existing readers and instructeurs.

Database triggers queue changed demandes and record one complete JSON state at transaction commit. Related changes within one transaction form a single business change; rolled-back and unchanged states produce no revision. Advisory locks serialize child-table changes to the same demande. The baseline migration records the existing state without inventing earlier history.

Snapshots include project data, people, phase events, expert opinions, decisions, prescriptions, controls, impacts with their reference labels, complete comments, sent CNPN email metadata and attachment metadata. They exclude login/session data and operational notification queues. A reference label is frozen with each recorded state; a global species reference refresh alone does not constitute a demande change.

Retained file references prevent normal cleanup from deleting historical documents. Finalized uploads receive fresh storage IDs, independent of client upload IDs. Downloads always recheck current access. The historical-state API requires full reading access and has no write route. Comparison aligns records by scoped identity, identical contents and then unambiguous semantic keys; it preserves duplicates and reports ambiguous records as additions/removals.

## Status

Implemented for owner review. The business decisions were approved on 3 November 2026; this record does not authorize deployment.

## Consequences

Lists show one project card after filtering demandes and identify the displayed demande. Exports retain one row per matching demande. Existing URLs, external identifiers and DN synchronization keep their existing targets. This feature does not change Onagre imports yet.

Every business write adds snapshot and storage costs. Backups must include both PostgreSQL and retained object storage. Before deploying, run the migration on a restored production backup and measure its baseline duration and size. Rollback requires the pre-migration backup and matching application version. Deleting an entire native demande through the existing administrator operation still deletes its history; ordinary child-record removal preserves history.

`format_version` identifies the stored representation. Future schema changes must preserve decoding of existing snapshots or introduce an explicit version conversion; they must not reinterpret old snapshots using current mutable reference data. The historical document is a domain view, not a recreation of an older application release. The activity feed remains available alongside it.
