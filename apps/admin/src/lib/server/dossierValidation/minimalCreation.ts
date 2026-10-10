import { error } from "@sveltejs/kit";

import type { AdminDossierRelations } from "@pitchou/server/database/dossier_admin_relations.ts";
import type { EntrepriseSiret } from "@pitchou/types/database/public/Entreprise.ts";
import type { GroupeInstructeursId } from "@pitchou/types/database/public/GroupeInstructeurs.ts";

import { rejectUnknownProperties } from "../requestValidation";

const trimmed = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Relations of a dossier created from the « Créer un dossier » modal: its groupe and porteur. */
export function parseMinimalCreationRelations(
  body: Record<string, unknown>,
): AdminDossierRelations {
  if (typeof body.groupe_instructeurs !== "string" || !body.groupe_instructeurs) {
    error(400, "Le groupe instructeurs est requis.");
  }
  const groupe_instructeurs = body.groupe_instructeurs as GroupeInstructeursId;
  const raw = body.porteur_de_projet;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    error(400, "Le porteur de projet est requis.");
  }
  const porteur = raw as Record<string, unknown>;

  if (porteur.type === "personne_physique") {
    rejectUnknownProperties(porteur, new Set(["type", "last_name", "first_names"]));
    const last_name = trimmed(porteur.last_name);
    const first_names = trimmed(porteur.first_names);
    if (!last_name || !first_names) {
      error(400, "Le nom et le prénom du porteur de projet sont requis.");
    }
    const identity = { last_name, first_names, email: null, phone: null, role: null };
    return {
      groupe_instructeurs,
      demandeur_type: "personne_physique",
      demandeur_personne_physique: { ...identity, address: null },
      demandeur_personne_morale: null,
      identites: [{ type: "demandeur", ...identity }],
    };
  }

  if (porteur.type === "personne_morale") {
    rejectUnknownProperties(porteur, new Set(["type", "siret"]));
    const siret = trimmed(porteur.siret).replaceAll(" ", "");
    if (!/^\d{14}$/.test(siret)) {
      error(400, "Le numéro de SIRET du porteur de projet doit contenir 14 chiffres.");
    }
    return {
      groupe_instructeurs,
      demandeur_type: "personne_morale",
      demandeur_personne_physique: null,
      demandeur_personne_morale: {
        siret: siret as EntrepriseSiret,
        legal_name: null,
        address: null,
        postal_code: null,
        department: null,
        region: null,
      },
      identites: [],
    };
  }

  error(400, "Le porteur de projet doit être une personne physique ou une personne morale.");
}
