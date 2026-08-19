export type ChangelogPayload = {
  /** `null` segments while the draft's version is empty or half-typed. */
  version_major: number | null;
  version_minor: number | null;
  version_patch: number | null;
  date: string;
  titre: string;
  contenu: string;
  published: boolean;
};

const PAYLOAD_PROPERTIES = new Set([
  "version_major",
  "version_minor",
  "version_patch",
  "date",
  "titre",
  "contenu",
  "published",
]);
const SEGMENT_PROPERTIES = ["version_major", "version_minor", "version_patch"] as const;
const TITRE_MAX_LENGTH = 200;
const CONTENU_MAX_LENGTH = 100_000;
const SEGMENT_MAX = 9999;

function isValidSegment(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= SEGMENT_MAX)
  );
}

export function validateChangelogPayload(
  payload: unknown,
): { ok: true; value: ChangelogPayload } | { ok: false; message: string } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return { ok: false, message: "La charge utile doit être un objet." };
  }
  const value = payload as Record<string, unknown>;
  const unknownProperty = Object.keys(value).find((property) => !PAYLOAD_PROPERTIES.has(property));
  if (unknownProperty) {
    return { ok: false, message: `Propriété non reconnue : '${unknownProperty}'.` };
  }
  for (const segment of SEGMENT_PROPERTIES) {
    if (!(segment in value) || !isValidSegment(value[segment])) {
      return {
        ok: false,
        message: `\`${segment}\` doit être un entier entre 0 et ${SEGMENT_MAX}, ou null.`,
      };
    }
  }
  if (typeof value.date !== "string" || !isValidDate(value.date)) {
    return { ok: false, message: "`date` doit être une date valide au format AAAA-MM-JJ." };
  }
  if (typeof value.titre !== "string") {
    return { ok: false, message: "`titre` doit être une chaîne de caractères." };
  }
  if (value.titre.length > TITRE_MAX_LENGTH) {
    return { ok: false, message: `\`titre\` ne doit pas dépasser ${TITRE_MAX_LENGTH} caractères.` };
  }
  if (typeof value.contenu !== "string") {
    return { ok: false, message: "`contenu` doit être une chaîne de caractères." };
  }
  if (value.contenu.length > CONTENU_MAX_LENGTH) {
    return {
      ok: false,
      message: `\`contenu\` ne doit pas dépasser ${CONTENU_MAX_LENGTH} caractères.`,
    };
  }
  if (typeof value.published !== "boolean") {
    return { ok: false, message: "`published` doit être un booléen." };
  }
  // A draft may stay half-filled, but the public page needs a titre and a
  // complete version — the completeness check only bites at publish time.
  if (
    value.published === true &&
    (value.titre.trim().length === 0 ||
      SEGMENT_PROPERTIES.some((segment) => value[segment] === null))
  ) {
    return {
      ok: false,
      message: "Une entrée publiée doit avoir un titre et une version complète.",
    };
  }
  return {
    ok: true,
    value: {
      version_major: value.version_major as number | null,
      version_minor: value.version_minor as number | null,
      version_patch: value.version_patch as number | null,
      date: value.date,
      titre: value.titre,
      contenu: value.contenu,
      published: value.published,
    },
  };
}

/** Accepts only real calendar dates in the plain YYYY-MM-DD form. */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [year, month, day] = date.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

/**
 * `id` is the changelog primary key and the admin URL segment; reject anything
 * that is not a positive integer before it reaches the database.
 */
export function isValidIdParam(id: string): boolean {
  return /^\d+$/.test(id) && Number(id) > 0 && Number.isSafeInteger(Number(id));
}
