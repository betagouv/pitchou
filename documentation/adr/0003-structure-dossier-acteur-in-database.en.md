# ADR-0003: Structure the other people involved in a dossier in the database

_Version française : [0003-structure-dossier-acteur-in-database.md](0003-structure-dossier-acteur-in-database.md)_

## Status

Accepted

## Context

There were confusions on the business side about the people involved in a project. A bit of a mix of business language and Démarche Numérique language. [ADR-0002](0002-structure-porteur-de-projet-in-database.en.md) structured the porteur de projet. This time, we put the other people involved back in order.

We tell apart the déposant (mandataire or not, not mandatory, comes from DN) and the personne contact. A dossier may have a déposant, may have a personne contact, may have other types of people involved.

Until now, these people lived in `identite_dossier` (one copy per type `demandeur`, `mandataire` or `representant`) and in `dossier.deposant`, which pointed to `personne`.

## Decision

**A `dossier_acteur` table.** A dossier may or may not have one or several people involved. A person involved is necessarily linked to a dossier and a non-null role. On the data side, the `dossier_acteur` table has the columns: `id`, `dossier`, `involvement`, `personne_physique` (FK to the `personne_physique` table). All the columns of `dossier_acteur` are non-null. Deleting a dossier deletes its `dossier_acteur` rows.

**The role is called `involvement`.** The role is the way the person is involved in the dossier. It is called `involvement` so as not to be confused with the `role` of `personne_physique`. It can be `mandataire`, `deposant`, `personne_contact`… and something else if needed. It is therefore a string (free text for now). Even if on the data side `involvement` is free text for the moment, as long as the spec is not settled, the code has an `Involvement` type.

**Several roles per person, several people per role.** A person can take several roles in the same dossier: two rows to the same `personne_physique` record. We can have several people for a role. A personne physique porteur who submits the dossier themselves is a single record with 3 references: `dossier.porteur_de_projet`, and the `deposant` and `beneficiaire_demarche_numerique` `dossier_acteur` rows.

**How we fill the columns (mostly DN for now).**

- The déposant is the one who submits in Démarche Numérique (the demandeur of the DN API, or the mandataire when there is one).
- The mandataire is the mandataire as DN means it today. A mandataire is necessarily a déposant too.
- The personne contact is filled from the DN form. We fill it only if the field is there, we do not look at the type of person.
- We keep the `beneficiaire_demarche_numerique` role. It will only be the DN demandeur.

**A resync only keeps the current roles.** If the mandataire disappears, its row is deleted. For now, we keep the `personne_physique`.

**Historique and notifications: we keep the same behavior.** They are computed on `dossier_acteur`, with the keys `involvement.property` (for example `personne_contact.phone`).

**Search: only on the déposant and the mandataire.**

**Admin: Représentant becomes Personne contact.**

**`dossier.deposant` is dropped.** The déposant is a `dossier_acteur`.

**`identite_dossier` is dropped in another PR.** Meanwhile, it is still written, but no longer read.

**The existing data is filled by a resync.** The dossiers that do not come from Démarche Numérique are not resynced: a migration fills them from `identite_dossier`, with the admin rules.

## Consequences

`identite_dossier` is still written by the synchronization, the admin and the seeds, with a comment saying it will be removed soon. It no longer produces historique, so that the same change is not notified twice.

The first time the acteurs of a dossier are filled, they are recorded in the historique as a baseline, without notification. The resync that follows the migration therefore does not mark every dossier as modified.

Changes made in the admin produce no historique: they do not come from the pétitionnaire.

A person with several roles produces one historique entry per role for the same change. Their block in the accordion then shows one "Vu" button per role.

The changes of a personne physique porteur are recorded under `beneficiaire_demarche_numerique.*`, since it is the same record. The porteur block shows them; the acteur block does not repeat them.

The same person can appear on two records, for example as personne contact and as DN bénéficiaire. As in ADR-0002, they are not merged automatically.

Deleting a dossier also deletes its `personne_physique` records (porteur and acteurs) that no other dossier references. A record left without role by a resync is kept.

The `personne` records once created for `dossier.deposant` stay in the database, without any reference.
