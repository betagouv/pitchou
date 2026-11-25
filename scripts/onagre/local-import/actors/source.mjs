// Owner-validated decision (25 November 2026): the people involved in a dossier depend on the
// pétitionnaire's `categorie.typepersonne`. Pure functions over the retained Onagre source rows.

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const civility = /^(?:m|mr|mme|mlle|monsieur|madame|mademoiselle)\.?$/iu;

/** Trimmed text, or null when empty or a placeholder such as `0`. */
export function sourceText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text && text !== "0" ? text : null;
}

/** Trimmed text kept as is, even a placeholder; null only when empty. */
function rawText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

export function sourceEmail(value) {
  const email = sourceText(value);
  return email && emailPattern.test(email) ? email : null;
}

export function projetRow(sample) {
  return sample.source?.rows?.projet?.find((row) => row.projetid === sample.identity.projetId);
}

/** "Personne Morale", "Personne Physique" or null when the category is unknown. */
export function petitionnaireType(sample) {
  const projet = projetRow(sample);
  const rows = sample.source?.rows ?? {};
  const petitionnaire = rows.petitionnaires?.find(
    (row) => projet && row.petitionnairesid === projet.petitionnairesid,
  );
  const categorie = rows.categorie?.find(
    (row) => petitionnaire && row.categorieid === petitionnaire.categorieid,
  );
  const type = categorie?.typepersonne;
  return type === "Personne Morale" || type === "Personne Physique" ? type : null;
}

const isUpperWord = (word) =>
  word === word.toUpperCase() && (word.match(/\p{L}/gu) ?? []).length >= 2;

/**
 * Splits `nomcoordinateur`: the leading civility is removed, uppercase words form the last name
 * and the other words the first names. Without that signal (no uppercase word, or only uppercase
 * words), the last word is the last name.
 */
export function splitCoordinateur(value) {
  const words = (sourceText(value) ?? "").split(/\s+/u).filter(Boolean);
  while (words.length > 1 && civility.test(words[0])) words.shift();
  if (words.length === 0 || (words.length === 1 && civility.test(words[0]))) return null;
  const upper = words.filter(isUpperWord);
  if (upper.length > 0 && upper.length < words.length)
    return {
      first_names: words.filter((word) => !isUpperWord(word)).join(" "),
      last_name: upper.join(" "),
    };
  return { first_names: words.slice(0, -1).join(" ") || null, last_name: words.at(-1) };
}

const letters = (value) =>
  (value ?? "")
    .normalize("NFKD")
    .replaceAll(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z]/gu, "");

/** True when the email's local part contains the last name, and the first name or its initial. */
export function emailMatchesPerson(email, firstNames, lastName) {
  const local = letters(email.split("@")[0]);
  const last = letters(lastName);
  if (last.length < 2 || !local.includes(last)) return false;
  const first = letters(firstNames);
  if (!first) return true;
  return local.includes(first) || local.replace(last, "") === first[0];
}

function person(first_names, last_name, values = {}) {
  return { first_names, last_name, email: null, address: null, phone: null, role: null, ...values };
}

/** Pitchou person fields are varchar(255); PostgreSQL counts characters, not UTF-16 units. */
export const personFieldLength = 255;

/** Owner decision: an over-long postal address is truncated rather than dropped. */
export function truncateAddress(value) {
  const text = sourceText(value);
  return text && [...text].slice(0, personFieldLength).join("").trimEnd();
}

/** The pétitionnaire's postal address and phone, the mobile phone first. */
function petitionnaireDetails(projet) {
  return {
    address: truncateAddress(projet.adressepetitionnaire),
    phone:
      sourceText(projet.telephoneportablepetitionnaire) ??
      sourceText(projet.telephonepetitionnaire),
  };
}

function coordinateur(sample, projet) {
  const name = splitCoordinateur(projet.nomcoordinateur);
  if (!name) return [];
  return [
    {
      sourceKey: `onagre-national:projet:${sample.identity.projetId}:coordinateur`,
      involvement: "personne_contact",
      values: person(name.first_names, name.last_name, {
        email: sourceEmail(projet.adressemailchefprojet),
      }),
    },
  ];
}

/**
 * The porteur and people derived from the source, or null when the pétitionnaire category is
 * unknown and the prepared porteur and contacts apply unchanged. A personne morale, or a personne
 * physique without any name, keeps the prepared porteur.
 */
export function sourceActors(sample) {
  const type = petitionnaireType(sample);
  const projet = projetRow(sample);
  if (!type || !projet) return null;
  const petitionnaireEmail = sourceEmail(projet.adressemailpetitionnaire);
  const chefEmail = sourceEmail(projet.adressemailchefprojet);
  if (type === "Personne Morale") {
    const first = rawText(projet.prenompersonne),
      last = rawText(projet.nompersonne);
    const beneficiaire =
      first || last
        ? [
            {
              sourceKey: `onagre-national:projet:${sample.identity.projetId}:beneficiaire`,
              involvement: "beneficiaire",
              values: person(first, last, {
                ...petitionnaireDetails(projet),
                email:
                  petitionnaireEmail ?? (sourceText(projet.nomcoordinateur) ? null : chefEmail),
              }),
            },
          ]
        : [];
    return {
      porteur: sample.proposal.porteur,
      people: [...beneficiaire, ...coordinateur(sample, projet)],
    };
  }
  const first = sourceText(projet.prenompersonne),
    last = sourceText(projet.nompersonne);
  const porteur =
    first || last
      ? {
          type: "personne_physique",
          values: person(first, last, {
            ...petitionnaireDetails(projet),
            email:
              petitionnaireEmail ??
              (chefEmail && emailMatchesPerson(chefEmail, first, last) ? chefEmail : null),
          }),
        }
      : sample.proposal.porteur;
  return { porteur, people: coordinateur(sample, projet) };
}
