// adapted from https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_1_%E2%80%93_escaping_the_string_before_encoding_it
export function UTF8ToB64(s: string): string {
  return btoa(unescape(encodeURIComponent(s)));
}

/**
 * Normalization of email addresses
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase();
}

/**
 * Normalization of the vernacular or scientific name of a single espèce
 */
export function normalizeEspeceName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .replaceAll("(le)", "")
    .replaceAll("(la)", "")
    .replaceAll(`(l')`, "")
    .trim();
}

/**
 * Normalization of a long text that may contain espèce names
 */
export function normalizeEspeceText(text: string): string {
  return text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replaceAll("’", "'")
    .toLowerCase();
}

export function removeAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
