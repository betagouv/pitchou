import { createHash } from "node:crypto";
import type { OnagreImportPolicy } from "@pitchou/types/onagreImport.ts";

export const SOURCE_INSTANCE = "onagre-national";
export const MAX_RECORDS = 10;
export const POLICY: OnagreImportPolicy = {
  version: "experimental-mappings-v2",
  title: "Profil expérimental v2, correspondances validées",
  description:
    "Crée un dossier par demande avec le nom du projet, le code et la date de réception historique. " +
    "Reprend les activités, motifs, lieux, périodes, service coordinateur et solutions alternatives lorsque leur correspondance validée est implémentée. " +
    "La date civile datereception est conservée à minuit UTC dans depot_date. " +
    "L'unité de reprise, l'assemblage des descriptions et cette convention de date restent expérimentaux. Les textes des correspondances ne sont jamais exécutés.",
  omissions: [
    "Aucun historique de phase ni décision administrative : chronologie et dates à trancher. Aucune date déduite.",
    "Aucun commentaire : auteur et date des commentaires Onagre à trancher dans les règles communes.",
    "Aucun porteur, acteur, service, groupe, suivi ou relation affecté.",
    "Aucune espèce, pièce jointe, localisation structurée ou autre donnée métier hors du profil.",
    "Aucune notification envoyée. Aucun dossier existant adopté ou modifié.",
    "Les autres champs restent à leur valeur par défaut en base, dont enjeu=false et free_comment vide.",
    "Les demandes d'un même projet restent des dossiers distincts. Leurs informations communes sont répétées.",
    "Les lignes demande, projet et références utilisées ainsi que les valeurs prévues sont conservées dans le registre.",
  ],
};

export class OnagreImportError extends Error {
  constructor(
    message: string,
    public status: 400 | 403 | 404 | 409 = 400,
  ) {
    super(message);
  }
}

export function getImportAvailability() {
  let reason: string | null = null;
  if (process.env.ONAGRE_DEPLOYMENT_ROLE !== "rehearsal")
    reason = "L'import est réservé au rôle rehearsal.";
  else if (process.env.ONAGRE_IMPORT_ENABLED !== "true")
    reason = "L'import expérimental n'est pas activé.";
  else if (process.env.ONAGRE_SOURCE_INSTANCE !== SOURCE_INSTANCE)
    reason = "ONAGRE_SOURCE_INSTANCE doit être onagre-national.";
  return { enabled: reason === null, reason };
}

export function assertImportEnabled() {
  const { reason } = getImportAvailability();
  if (reason) throw new OnagreImportError(reason, 403);
}

export function recordIds(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_RECORDS ||
    value.some(
      (id) => typeof id !== "string" || !/^[1-9]\d{0,9}$/u.test(id) || Number(id) > 2147483647,
    ) ||
    new Set(value).size !== value.length
  )
    throw new OnagreImportError("Choisissez entre 1 et 10 identifiants demandesid distincts.");
  return [...value].sort((a, b) => Number(a) - Number(b));
}

export function positiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > 2147483647)
    throw new OnagreImportError("Identifiant de snapshot invalide.");
  return value;
}

export function uuid(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(value))
    throw new OnagreImportError("Identifiant d'aperçu ou de rapport invalide.");
  return value;
}

export function hash(value: unknown): string {
  const canonical = (input: unknown): unknown => {
    if (input instanceof Date) return input.toISOString();
    if (Array.isArray(input)) return input.map(canonical);
    if (input && typeof input === "object")
      return Object.fromEntries(
        Object.entries(input)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, val]) => [key, canonical(val)]),
      );
    return input;
  };
  return createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
}

export function receptionDate(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value) || value.startsWith("0000")) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value
    : null;
}
