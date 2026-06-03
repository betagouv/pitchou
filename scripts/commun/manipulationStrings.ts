// adapted from https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
export function UTF8ToB64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

/**
 * Normalisation des adresses email
 */
export function normalisationEmail(email: string): string {
  return email.toLowerCase();
}

/**
 * Normalisation du nom vernaculaire ou scientifique d'une seule espèce
 */
export function normalizeNomEspèce(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replaceAll("(le)", "")
    .replaceAll("(la)", "")
    .replaceAll(`(l')`, "")
    .trim();
}

/**
 * Normalisation d'un texte long pouvant contenir des noms d'espèces
 */
export function normalizeTexteEspèce(texte: string): string {
  return texte
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replaceAll("’", "'")
    .toLowerCase();
}

export function retirerAccents(texte: string): string {
  return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
