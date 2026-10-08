# ADR-0002: Structure the people involved in a dossier in the database

_Version française : [0002-structure-porteur-de-projet-in-database.md](0002-structure-porteur-de-projet-in-database.md)_

## Status

Accepted

## Context

The people involved in a dossier were poorly told apart, in the data as in the team. Démarche Numérique asks for the identity of the "demandeur", or beneficiary, in a standard block that is not part of our form and only holds a first and a last name. The instructrices filled it in wrongly: for them, the beneficiary is the porteur de projet, often a personne morale. In the team too, demandeur, déposant, beneficiary and porteur de projet were mixed up.

On October 8, 2026, the production database holds 3,098 Démarche Numérique dossiers. Among them, 1,047 have no "Porteur de projet" section, and 918 declare a personne morale without giving a SIRET. In Démarche Numérique, this information is not mandatory: the SIRET is optional, and the porteur type ("Le demandeur est…") is only asked when the "Porteur de projet" section is shown, which depends on the previous answers of the form.

This ADR covers the porteur de projet. The other people involved (déposant, mandataire, personne contact) will be structured later.

## Decision

**One porteur de projet per dossier.** The `dossier.porteur_de_projet` column points to the `porteur_de_projet` table, which references either a `personne_physique` or an `entreprise` (the personne morale, identified by its SIRET). A constraint enforces exactly one of the two references.

**A `personne_physique` table separate from `personne`.** `personne` enforces a unique email, as it backs the accounts, and it is meant to become the users table. We do not mix users with the people involved in a dossier.

**No uniqueness constraint on `personne_physique`.** We have no reliable identifier: two homonyms can share a service address (two "John Doe" with contact@example.com), and a person can change email. Merging on these criteria could mix two people: the phone number of one would change the dossier of the other. We prefer duplicates, reusable once we know it is the same person, but never merged automatically.

**A personne morale is shared, a personne physique is not.** The dossiers of the same SIRET share their porteur. A personne physique stays tied to its dossier, since we cannot recognize it from one dossier to another.

**A trigger deletes orphan porteurs.** A `porteur_de_projet` is only a link: it is deleted once no dossier references it. The `personne_physique` and the `entreprise` are kept. A trigger rather than code, because several writers change the porteur (synchronization, admin, dossier deletion).

**Démarche Numérique is the source for its dossiers.** The answer to "Le demandeur est…" decides the type. For a personne physique, we take `dossier.demandeur`, which Démarche Numérique considers the beneficiary, with or without a mandataire. For a personne morale, we take the SIRET. When Démarche Numérique does not return the establishment, the entreprise is created with its SIRET only.

**`porteur_de_projet` stays nullable.** It will become mandatory once creating a dossier can require it, which is not the case in Démarche Numérique today.

**Without porteur, the interface shows "Non renseigné".** It no longer falls back on the Démarche Numérique demandeur, which would be incorrect information. That demandeur stays stored in `identite_dossier`.

## Consequences

The former `demandeur_personne_physique` and `demandeur_personne_morale` columns are still written, as they are still read by the public statistics, GeoMCE and the entreprise change history of the synchronization. The interface no longer reads them.

The same personne physique can exist in several copies. If needed, they will be merged by hand.

Démarche Numérique dossiers without a porteur section, those declaring a personne morale without SIRET, and imported dossiers (GunEnv, Onagre, files) have no porteur.

The `{demandeur}` document tag becomes `{porteur_de_projet}`. The former one remains available for existing templates.

When read, the porteur is a union type told apart by `type` (`personne_physique` or `personne_morale`). When written, `PorteurDeProjetInitializer` only carries the SIRET of a personne morale.

The admin requires a porteur when creating a dossier, as when editing it.

The "Le demandeur" block shown for a personne morale is removed from the "Porteur de projet" accordion.
