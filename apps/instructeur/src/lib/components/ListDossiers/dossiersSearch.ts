import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import { removeAccents } from "@pitchou/common/stringManipulation.ts";
import { nomParCodeDépartement } from "@pitchou/common/départements.ts";
import type { DossiersContext } from "./dossiersQuery.ts";

/** Strips accents and lowercases so the search is accent- and case-insensitive. */
function normalize(text: string): string {
  return removeAccents(text).toLowerCase();
}

/**
 * Splits a search query into individual terms. Punctuation and whitespace separate
 * terms, so « 24, carriere » yields two terms that are matched independently (AND).
 */
export function searchTerms(text: string): string[] {
  return normalize(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/**
 * Prepends a search to the recent list: trims, moves an existing duplicate to the top
 * (case-insensitive), caps at `max`.
 */
export function addRecentSearch(searches: string[], text: string, max = 3): string[] {
  const trimmed = text.trim();
  if (!trimmed) return searches;
  return [trimmed, ...searches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(
    0,
    max,
  );
}

/** Emails of the instructeurs following the given dossier. */
function instructeurEmailsForDossier(
  dossierId: DossierSummary["id"],
  relationSuivis: DossiersContext["relationSuivis"],
): string[] {
  if (!relationSuivis) return [];
  const emails: string[] = [];
  for (const [email, dossiers] of relationSuivis) {
    if (dossiers.has(dossierId)) emails.push(email);
  }
  return emails;
}

/**
 * Every searchable field of a dossier concatenated and normalised. Covers the nom,
 * commentaire libre, activité principale, départements (code + name), communes (name +
 * postal code), régions, décision numéros, demandeur / déposant, the DS number, the
 * ONAGRE identifier and the instructeurs following the dossier.
 */
export function searchableText(dossier: DossierSummary, ctx: DossiersContext): string {
  const parts: (string | null | undefined)[] = [
    dossier.nom,
    dossier.commentaire_libre,
    dossier.activité_principale,
    dossier.number_demarches_simplifiées,
    dossier.historique_identifiant_demande_onagre,
    dossier.déposant_nom,
    dossier.déposant_prénoms,
    dossier.demandeur_personne_physique_nom,
    dossier.demandeur_personne_physique_prénoms,
    dossier.demandeur_personne_morale_raison_sociale,
    dossier.demandeur_personne_morale_siret,
  ];

  for (const code of dossier.départements ?? []) {
    parts.push(code, nomParCodeDépartement.get(code));
  }
  for (const commune of dossier.communes ?? []) {
    parts.push(commune.name, commune.postalCode);
  }
  for (const region of dossier.régions ?? []) {
    parts.push(region);
  }
  for (const decision of dossier.décisionsAdministratives ?? []) {
    parts.push(decision.numéro);
  }
  parts.push(...instructeurEmailsForDossier(dossier.id, ctx.relationSuivis));

  return normalize(parts.filter(Boolean).join(" "));
}

/**
 * True when the dossier matches the search: every term must appear (as a substring, so
 * a partial input already matches) somewhere in its searchable fields. Terms combine
 * with AND, letting « 24 carriere » cross the département and the activité.
 */
export function dossierMatchesSearch(
  dossier: DossierSummary,
  terms: string[],
  ctx: DossiersContext,
): boolean {
  if (terms.length === 0) return true;
  const haystack = searchableText(dossier, ctx);
  return terms.every((term) => haystack.includes(term));
}
