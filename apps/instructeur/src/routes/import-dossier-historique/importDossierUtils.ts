import { json } from "d3-fetch";
import memoize from "just-memoize";
import { normalizeEmail } from "@pitchou/common/manipulationStrings.ts";

import type { GeoAPIDepartement, GeoAPICommune } from "@pitchou/types/GeoAPI.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

export type { AdditionalDataForDossierCreation } from "@pitchou/types/demarche-numerique/DossierPourSynchronisation.ts";

/**
 * Type that defines the messages:
 *  - warning (where we can suggest a correct alternative)
 *  - error (where a correction from the user is required)
 */
export type Alerte = {
  type: "erreur" | "avertissement";
  message: string;
};

export type DossierAvecAlertes = Partial<
  DossierDemarcheNumerique88444 & {
    alertes: Alerte[];
  }
>;

/**
 * Retrieves all the data of the commune as well as that of its département.
 *
 * @see https://geo.api.gouv.fr/decoupage-administratif/communes
 */
async function getCommuneData(nomCommune: string): Promise<{
  data: (GeoAPICommune & { departement: GeoAPIDepartement }) | null;
  alerte?: Alerte;
}> {
  const commune = await json(
    `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(nomCommune)}&fields=codeDepartement,codeRegion,codesPostaux,population,codeEpci,siren,departement&format=json&geometry=centre`,
  );

  if (!Array.isArray(commune) || commune.length === 0) {
    const messageAlerte = `La commune n'a pas été trouvée par geo.api.gouv.fr. Nom de la commune : ${nomCommune}.`;
    console.warn(messageAlerte);
    return { data: null, alerte: { type: "avertissement", message: messageAlerte } };
  }

  return { data: commune[0] };
}

const memoizedGetCommuneData = memoize(getCommuneData);

export { memoizedGetCommuneData as getCommuneData };

/**
 * @see {@link https://geo.api.gouv.fr/decoupage-administratif/communes}
 */
async function _getDepartementData(
  code: string,
): Promise<{ data: GeoAPIDepartement | null; alerte?: Alerte }> {
  const departement = await json(
    `https://geo.api.gouv.fr/departements/${encodeURIComponent(code)}`,
  );

  if (!departement) {
    const messageAlerte = `Le département n'a pas été trouvé par geo.api.gouv.fr. Code du département : ${code}.`;
    console.warn(messageAlerte);
    return { data: null, alerte: { type: "erreur", message: messageAlerte } };
  }
  //@ts-ignore
  return { data: departement };
}

/**
 * Extracts an array of commune names from a string.
 * The string can contain names separated by commas (`,`), slashes (`/`), or a mix of both.
 * Examples of input values:
 * - Arthonnay, Mélisey, Quincerot, Rugny, Thorey, Trichey et Villon
 * - Argenteuil-sur-Armancon / Moulins-en-Tonnerrois
 * - Mélisey
 *
 * We do not include the "-" separator because many towns contain "-"
 */
export function extraireCommunes(valeur: string): string[] {
  if (typeof valeur !== "string") return [];

  // Use a regular expression to split on ',' or '/'
  const communes = valeur.split(/[\/,]/);

  // Trim extra whitespace and filter out empty items
  return communes.map((c) => c.trim()).filter((c) => c.length > 0);
}

/**
 * Formats a value (code or string) into one or more recognized départements.
 * Returns null if no département is recognized.
 */
async function formaterDepartementDepuisValeur(
  valeur: string | number,
): Promise<{ data: GeoAPIDepartement[] | null; alertes: Alerte[] }> {
  let codes: string[] = [];
  if (typeof valeur === "number") {
    codes = [valeur.toString()];
  }
  if (typeof valeur === "string") {
    const blocs = valeur.split("-");
    // This allows retrieving values like "21-78"
    for (const bloc of blocs) {
      codes.push(bloc);
    }
  }

  const departementsP = codes.map((code) => _getDepartementData(code));
  const alertes: Alerte[] = [];

  try {
    const resultats = await Promise.all(departementsP);

    for (const résultat of resultats) {
      if (résultat.alerte) {
        alertes.push(résultat.alerte);
      }
    }

    const départements = resultats.map((résultat) => résultat.data).filter((dep) => dep !== null);

    if (départements.length >= 1) {
      // We force the cast because the logic guarantees a non-empty array
      return {
        data: départements as [GeoAPIDepartement, ...GeoAPIDepartement[]],
        alertes,
      };
    } else {
      return { data: null, alertes };
    }
  } catch (e) {
    const messageAlerte = `Une erreur ${e} est survenue lors de l'appel de l'API de geo.api.gouv pour le(s) département(s) : ${valeur}.`;
    console.warn(messageAlerte);
    alertes.push({ type: "erreur", message: messageAlerte });
    return { data: null, alertes };
  }
}

const memoizedFormaterDepartementDepuisValeur = memoize(formaterDepartementDepuisValeur);

export { memoizedFormaterDepartementDepuisValeur as formaterDepartementDepuisValeur };

/**
 * Attempts to extract a first name and a last name from a text string.
 *
 * @example
 *   extraireNom("Jean Dupont <jean.dupont@email.fr>") // { prénom: "Jean", nom: "Dupont" }
 */
export function extraireNom(text: string): Partial<{ prénom: string; nom: string }> | null {
  const nameRegex = /['"]?([\p{L}'-]+)\s+([\p{L}'-]+)/u;

  const match = nameRegex.exec(text);

  if (match) {
    return { prénom: match[1], nom: match[2] };
  }
  return null;
}

/**
 * Extracts the first email address found in a text string.
 *
 * @example
 *   extrairePremierMail("Jean Dupont <jean.dupont@email.fr>") // "jean.dupont@email.fr"
 */
export function extrairePremierMail(text: string): string | null {
  // Source Regex Mail : https://html.spec.whatwg.org/multipage/input.html#valid-e-mail-address
  const mailRegex =
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const résultat = text.match(mailRegex);

  return résultat && résultat?.length ? normalizeEmail(résultat[0]) : null;
}

/**
 * Attempts to extract a first name and a last name from an email address.
 *
 * @example
 *   extraireNomDunMail("jean.dupont@email.fr") // { prénom: "Jean", nom: "Dupont" }
 */
export function extraireNomDunMail(mail: string): Partial<{ prénom: string; nom: string }> {
  if (!mail.includes("@")) return { prénom: "", nom: "" };

  const localPart = mail.split("@")[0];

  // Common separators
  const parts = localPart.split(/[._\-]/).filter((s) => s.length >= 1);

  if (parts.length === 2) {
    const [a, b] = parts;

    // We assume the first part is the first name.
    return {
      prénom: capitalize(a),
      nom: capitalize(b),
    };
  }

  return {
    prénom: "",
    nom: "",
  };
}

/**
 * Capitalizes the first letter of a string, the rest in lowercase.
 *
 * @example
 *   capitalize("jean") // "Jean"
 */
function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
